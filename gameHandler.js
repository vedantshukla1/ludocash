const Game = require('../models/Game');
const User = require('../models/User');
const {
  TURN_DURATION_MS,
} = require('../config/constants');
const {
  rollDice,
  getMovablePieces,
  hasAnyMove,
  findPiece,
  calculateNewPosition,
  findKillTarget,
  allPiecesHome,
  nextTurnColor,
} = require('../services/gameEngine');
const { creditWinnings, recordLoss } = require('../services/walletService');

const chooseBestAutoMove = (gameState, color, dice, movable) => {
  if (movable.length === 0) return null;
  const colorEntry = gameState.pieces.find((e) => e.color === color);
  if (!colorEntry) return movable[0];

  // 1. Try to find a killing move
  for (const pid of movable) {
    const piece = colorEntry.pieces.find((p) => p.id === pid);
    const target = calculateNewPosition(color, piece, dice);
    if (target && target.newState === 'on-board') {
      const killTarget = findKillTarget(gameState, color, target.absolutePos);
      if (killTarget) return pid;
    }
  }

  // 2. Try to spawn out of base
  if (dice === 6) {
    const basePiece = colorEntry.pieces.find((p) => p.state === 'base' && movable.includes(p.id));
    if (basePiece) return basePiece.id;
  }

  return movable[0];
};

const activeGames = new Map();

const getActiveGame = (gameId) => activeGames.get(gameId);

const getActiveGameByUserId = (userId) => {
  for (const [gameId, active] of activeGames.entries()) {
    const player = active.game.players.find((p) => p.userId.toString() === userId.toString());
    if (player) {
      if (active.disqualified && active.disqualified.has(player.color)) {
        continue;
      }
      return active;
    }
  }
  return null;
};

const registerActiveGame = (gameId, data) => {
  activeGames.set(gameId, data);
};

const removeActiveGame = (gameId) => {
  const game = activeGames.get(gameId);
  if (game?.turnTimer) clearTimeout(game.turnTimer);
  if (game?.countdownInterval) clearInterval(game.countdownInterval);
  activeGames.delete(gameId);
};

const emitToGame = (gameId, event, data) => {
  const active = activeGames.get(gameId);
  if (!active?.io) return;
  active.io.to(`game:${gameId}`).emit(event, data);
};

const saveGameState = async (gameId) => {
  const active = activeGames.get(gameId);
  if (!active) return;
  await Game.findByIdAndUpdate(gameId, {
    gameState: active.gameState,
    events: active.game.events || [],
  });
};

const advanceTurn = (gameId, extraTurn = false, reason = '') => {
  const active = activeGames.get(gameId);
  if (!active) return;

  const { gameState } = active;
  gameState.diceRolled = false;
  gameState.diceValue = null;

  if (!extraTurn) {
    gameState.consecutiveSixes = 0;
    gameState.currentTurn = nextTurnColor(gameState, gameState.currentTurn);
  }

  emitToGame(gameId, 'turn_change', {
    currentTurn: gameState.currentTurn,
    extraTurn,
    reason,
  });

  startTurnTimer(gameId);
};

const endGame = async (gameId, winnerColor) => {
  const active = activeGames.get(gameId);
  if (!active) return;

  if (active.turnTimer) clearTimeout(active.turnTimer);

  const winnerPlayer = active.game.players.find((p) => p.color === winnerColor);
  if (!winnerPlayer) return;

  const winnerId = winnerPlayer.userId;
  
  let winnerUser = null;
  let netAmount = active.game.prizePool;
  let tdsAmount = 0;

  if (!winnerPlayer.isBot) {
    try {
      const res = await creditWinnings(winnerId, active.game.prizePool, gameId);
      winnerUser = res.user;
      netAmount = res.netAmount;
      tdsAmount = res.tdsAmount;
    } catch (e) {
      console.error('Error crediting winnings:', e);
    }
  }

  for (const player of active.game.players) {
    if (player.userId.toString() !== winnerId.toString() && !player.isBot) {
      try {
        await recordLoss(player.userId, gameId);
      } catch (e) {
        console.error('Error recording loss:', e);
      }
    }
  }

  await Game.findByIdAndUpdate(gameId, {
    status: 'completed',
    winner: winnerId,
    gameState: active.gameState,
    completedAt: new Date(),
    events: [
      ...(active.game.events || []),
      { type: 'game_over', winner: winnerColor, at: new Date() },
    ],
  });

  const result = {
    winner: {
      userId: winnerId,
      color: winnerColor,
      name: winnerPlayer.name,
      prize: netAmount,
      grossPrize: active.game.prizePool,
      tds: tdsAmount,
    },
    players: active.game.players,
    prizePool: active.game.prizePool,
    wallet: winnerUser ? winnerUser.wallet : { balance: 0, withdrawable: 0, bonus: 0 },
    stats: winnerUser ? winnerUser.stats : {},
  };

  emitToGame(gameId, 'game_over', result);
  removeActiveGame(gameId);
};

const handleDisqualification = async (gameId, disqualifiedColor) => {
  const active = activeGames.get(gameId);
  if (!active) return;

  active.disqualified = active.disqualified || new Set();
  active.disqualified.add(disqualifiedColor);

  emitToGame(gameId, 'player_disqualified', { color: disqualifiedColor });

  // Move all pieces of this player to base
  const playerPieces = active.gameState.pieces.find((e) => e.color === disqualifiedColor);
  if (playerPieces) {
    playerPieces.pieces.forEach((p) => {
      p.state = 'base';
      p.position = -1;
      p.absolutePos = -1;
    });
  }

  // Remove the player's color from turnOrder so they are never visited again
  active.gameState.turnOrder = active.gameState.turnOrder.filter((c) => c !== disqualifiedColor);

  // Check how many players are left in turn order
  if (active.gameState.turnOrder.length <= 1) {
    // Only one player remains! They win.
    const winnerColor = active.gameState.turnOrder[0] || active.game.players.find((p) => p.color !== disqualifiedColor)?.color || 'red';
    await endGame(gameId, winnerColor);
  } else {
    // Switch turn to the next player
    advanceTurn(gameId, false, 'disqualification');
  }
};

const autoRollAndMove = async (gameId) => {
  const active = activeGames.get(gameId);
  if (!active) return;

  const color = active.gameState.currentTurn;
  active.gameState.diceRolled = true;

  emitToGame(gameId, 'dice_roll_start', { color });

  setTimeout(async () => {
    const current = activeGames.get(gameId);
    if (!current || current.gameState.currentTurn !== color) return;

    const isDestinedWinner = current.game.isBotMatch && current.game.destinedWinnerColor
      ? (color === current.game.destinedWinnerColor)
      : null;

    const dice = rollDice(isDestinedWinner);
    current.gameState.diceValue = dice;

    const movable = getMovablePieces(current.gameState, color, dice);

    emitToGame(gameId, 'dice_result', {
      color,
      dice,
      movablePieces: movable,
      autoRolled: true,
    });

    if (movable.length === 0) {
      const extraTurn = dice === 6;
      setTimeout(() => advanceTurn(gameId, extraTurn, 'no_move'), 800);
      return;
    }

    const pieceId = chooseBestAutoMove(current.gameState, color, dice, movable);
    await applyMove(gameId, color, pieceId, true);
  }, 800);
};

const applyMove = async (gameId, color, pieceId, autoMove = false) => {
  const active = activeGames.get(gameId);
  if (!active) return;

  const { gameState } = active;
  const dice = gameState.diceValue;
  const piece = findPiece(gameState, color, pieceId);
  if (!piece) return;

  const moveResult = calculateNewPosition(color, piece, dice);
  if (!moveResult) return;

  piece.state = moveResult.newState;
  piece.position = moveResult.newPos;
  piece.absolutePos = moveResult.absolutePos;

  emitToGame(gameId, 'piece_moved', {
    color,
    pieceId,
    newState: moveResult.newState,
    newPosition: moveResult.newPos,
    toPos: moveResult.absolutePos,
    autoMove,
  });

  let extraTurn = dice === 6;
  let killed = false;

  if (moveResult.newState === 'on-board') {
    const killTarget = findKillTarget(gameState, color, moveResult.absolutePos);
    if (killTarget) {
      killTarget.piece.state = 'base';
      killTarget.piece.position = -1;
      killTarget.piece.absolutePos = -1;
      killed = true;
      extraTurn = true;

      emitToGame(gameId, 'piece_killed', {
        killerColor: color,
        killedColor: killTarget.color,
        killedPieceId: killTarget.piece.id,
      });
    }
  }

  if (moveResult.reachedHome) {
    extraTurn = true;
    emitToGame(gameId, 'piece_home', { color, pieceId });
  }

  if (allPiecesHome(gameState, color)) {
    await saveGameState(gameId);
    await endGame(gameId, color);
    return;
  }

  await saveGameState(gameId);
  advanceTurn(gameId, extraTurn, killed ? 'kill' : moveResult.reachedHome ? 'home' : dice === 6 ? 'six' : '');
};

const startTurnTimer = (gameId) => {
  const active = activeGames.get(gameId);
  if (!active) return;

  if (active.turnTimer) clearTimeout(active.turnTimer);

  const color = active.gameState.currentTurn;
  const currentPlayer = active.game.players.find(p => p.color === color);
  const isBotTurn = currentPlayer?.isBot || false;
  
  const timeoutMs = isBotTurn ? 1500 : TURN_DURATION_MS;

  active.turnTimer = setTimeout(async () => {
    const current = activeGames.get(gameId);
    if (!current) return;

    if (!isBotTurn) {
      current.timeouts = current.timeouts || {};
      current.timeouts[color] = (current.timeouts[color] || 0) + 1;

      emitToGame(gameId, 'turn_timeout', { color, timeoutCount: current.timeouts[color] });

      if (current.timeouts[color] >= 3) {
        await handleDisqualification(gameId, color);
        return;
      }
    }

    if (!current.gameState.diceRolled) {
      await autoRollAndMove(gameId);
    } else {
      const movable = getMovablePieces(
        current.gameState,
        current.gameState.currentTurn,
        current.gameState.diceValue,
      );
      if (movable.length > 0) {
        const bestPieceId = chooseBestAutoMove(
          current.gameState,
          current.gameState.currentTurn,
          current.gameState.diceValue,
          movable
        );
        await applyMove(gameId, current.gameState.currentTurn, bestPieceId, true);
      } else {
        advanceTurn(gameId, current.gameState.diceValue === 6, 'timeout');
      }
    }
  }, timeoutMs);
};

const handleRollDice = async (socket, { gameId }) => {
  const active = activeGames.get(gameId);
  if (!active) return socket.emit('error_event', { message: 'Game not found' });

  const player = active.game.players.find(
    (p) => p.userId.toString() === socket.userId,
  );
  if (!player) return socket.emit('error_event', { message: 'Not in this game' });

  const color = player.color;
  if (active.gameState.currentTurn !== color) {
    return socket.emit('error_event', { message: 'Not your turn' });
  }
  if (active.gameState.diceRolled) {
    return socket.emit('error_event', { message: 'Already rolled' });
  }

  if (active.turnTimer) clearTimeout(active.turnTimer);

  active.gameState.diceRolled = true;

  // Broadcast roll start to all players
  emitToGame(gameId, 'dice_roll_start', { color });

  setTimeout(async () => {
    const current = activeGames.get(gameId);
    if (!current || current.gameState.currentTurn !== color) return;

    const isDestinedWinner = current.game.isBotMatch && current.game.destinedWinnerColor
      ? (color === current.game.destinedWinnerColor)
      : null;

    const dice = rollDice(isDestinedWinner);
    current.gameState.diceValue = dice;

    if (dice === 6) {
      current.gameState.consecutiveSixes = (current.gameState.consecutiveSixes || 0) + 1;
      if (current.gameState.consecutiveSixes >= 3) {
        current.gameState.consecutiveSixes = 0;
        current.gameState.diceRolled = false;
        current.gameState.diceValue = null;
        emitToGame(gameId, 'dice_result', { color, dice, movablePieces: [], skipped: true });
        return advanceTurn(gameId, false, 'three_sixes');
      }
    } else {
      current.gameState.consecutiveSixes = 0;
    }

    const movable = getMovablePieces(current.gameState, color, dice);

    emitToGame(gameId, 'dice_result', {
      color,
      dice,
      movablePieces: movable,
      autoRolled: false,
    });

    await saveGameState(gameId);

    if (movable.length === 0) {
      setTimeout(() => advanceTurn(gameId, dice === 6, 'no_move'), 1000);
    } else {
      startTurnTimer(gameId);
    }
  }, 800);
};

const handleMovePiece = async (socket, { gameId, pieceId: rawPieceId }) => {
  const pieceId = Number(rawPieceId);
  const active = activeGames.get(gameId);
  if (!active) return socket.emit('error_event', { message: 'Game not found' });

  const player = active.game.players.find(
    (p) => p.userId.toString() === socket.userId,
  );
  if (!player) return socket.emit('error_event', { message: 'Not in this game' });

  const color = player.color;
  if (active.gameState.currentTurn !== color) {
    console.warn('Invalid move: wrong turn', { userId: socket.userId, gameId, pieceId });
    return socket.emit('error_event', { message: 'Not your turn' });
  }
  if (!active.gameState.diceRolled) {
    return socket.emit('error_event', { message: 'Roll dice first' });
  }

  const movable = getMovablePieces(
    active.gameState,
    color,
    active.gameState.diceValue,
  );
  if (!movable.includes(pieceId)) {
    console.warn('Invalid move attempt', { userId: socket.userId, gameId, pieceId });
    return socket.emit('error_event', { message: 'Invalid move' });
  }

  if (active.turnTimer) clearTimeout(active.turnTimer);
  await applyMove(gameId, color, pieceId, false);
};

const handleSendEmoji = (socket, { gameId, emoji }) => {
  emitToGame(gameId, 'receive_emoji', {
    userId: socket.userId,
    emoji,
  });
};

const handleReconnectGame = async (socket, { gameId }) => {
  const active = activeGames.get(gameId);
  if (!active) return;

  const player = active.game.players.find(
    (p) => p.userId.toString() === socket.userId,
  );
  if (!player) return;

  active.sockets[socket.userId] = socket.id;
  player.disconnected = false;
  socket.join(`game:${gameId}`);

  socket.emit('game_state_update', {
    gameId,
    gameState: active.gameState,
    players: active.game.players,
  });

  emitToGame(gameId, 'opponent_reconnected', {
    userId: socket.userId,
    color: player.color,
  });
};

const handleGameDisconnect = (socket, io) => {
  for (const [gameId, active] of activeGames.entries()) {
    const player = active.game.players.find(
      (p) => active.sockets[p.userId.toString()] === socket.id,
    );
    if (player) {
      player.disconnected = true;
      delete active.sockets[player.userId.toString()];
      emitToGame(gameId, 'opponent_left', {
        userId: player.userId,
        color: player.color,
        name: player.name,
      });
    }
  }
};

const handleLeaveGame = async (socket, { gameId }) => {
  const active = activeGames.get(gameId);
  if (!active) return;

  const player = active.game.players.find((p) => p.userId.toString() === socket.userId.toString());
  if (!player) return;

  socket.leave(`game:${gameId}`);
  await handleDisqualification(gameId, player.color);
};

module.exports = {
  getActiveGame,
  getActiveGameByUserId,
  registerActiveGame,
  removeActiveGame,
  startTurnTimer,
  handleRollDice,
  handleMovePiece,
  handleSendEmoji,
  handleReconnectGame,
  handleGameDisconnect,
  handleLeaveGame,
};
