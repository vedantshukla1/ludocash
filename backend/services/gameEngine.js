const {
  COLORS_ORDER,
  COLOR_START,
  SAFE_SQUARES,
} = require('../config/constants');

const toAbsolute = (color, relativePos) => {
  const start = COLOR_START[color];
  return (start + relativePos) % 52;
};

const calculateNewPosition = (color, piece, dice) => {
  if (piece.state === 'home') return null;

  if (piece.state === 'base') {
    if (dice !== 6) return null;
    return {
      newPos: 0,
      newState: 'on-board',
      absolutePos: COLOR_START[color],
      homeColumn: false,
      reachedHome: false,
    };
  }

  if (piece.state === 'on-board') {
    const newRel = piece.position + dice;
    if (newRel > 57) {
      return null;
    } else if (newRel > 51) {
      const homeColPos = newRel - 52;
      if (homeColPos > 5) return null;
      return {
        newPos: homeColPos,
        newState: homeColPos === 5 ? 'home' : 'home-column',
        absolutePos: -1,
        homeColumn: true,
        reachedHome: homeColPos === 5,
      };
    }
    return {
      newPos: newRel,
      newState: 'on-board',
      absolutePos: toAbsolute(color, newRel),
      homeColumn: false,
      reachedHome: false,
    };
  }

  if (piece.state === 'home-column') {
    const newColPos = piece.position + dice;
    if (newColPos > 5) return null;
    return {
      newPos: newColPos,
      newState: newColPos === 5 ? 'home' : 'home-column',
      absolutePos: -1,
      homeColumn: true,
      reachedHome: newColPos === 5,
    };
  }

  return null;
};

const getMovablePieces = (gameState, color, dice) => {
  const colorEntry = gameState.pieces.find((p) => p.color === color);
  if (!colorEntry) return [];

  return colorEntry.pieces
    .filter((piece) => calculateNewPosition(color, piece, dice) !== null)
    .map((p) => p.id);
};

const hasAnyMove = (gameState, color, dice) =>
  getMovablePieces(gameState, color, dice).length > 0;

const createInitialGameState = (colors) => {
  const pieces = colors.map((color) => ({
    color,
    pieces: [0, 1, 2, 3].map((id) => ({
      id,
      state: 'base',
      position: -1,
      absolutePos: -1,
    })),
  }));

  return {
    pieces,
    currentTurn: colors[0],
    diceValue: null,
    diceRolled: false,
    consecutiveSixes: 0,
    turnOrder: [...colors],
  };
};

const findPiece = (gameState, color, pieceId) => {
  const entry = gameState.pieces.find((p) => p.color === color);
  if (!entry) return null;
  return entry.pieces.find((p) => p.id === pieceId);
};

const findKillTarget = (gameState, movingColor, absolutePos) => {
  if (absolutePos < 0 || SAFE_SQUARES.has(absolutePos)) return null;

  for (const entry of gameState.pieces) {
    if (entry.color === movingColor) continue;
    for (const piece of entry.pieces) {
      if (piece.state === 'on-board' && piece.absolutePos === absolutePos) {
        return { color: entry.color, piece };
      }
    }
  }
  return null;
};

const allPiecesHome = (gameState, color) => {
  const entry = gameState.pieces.find((p) => p.color === color);
  if (!entry) return false;
  return entry.pieces.every((p) => p.state === 'home');
};

const nextTurnColor = (gameState, currentColor) => {
  const idx = gameState.turnOrder.indexOf(currentColor);
  return gameState.turnOrder[(idx + 1) % gameState.turnOrder.length];
};

const trueRandom = () => {
  let byte;
  do { byte = require('crypto').randomBytes(1)[0]; } while (byte >= 252);
  return (byte % 6) + 1;
};

/**
 * Calculate game progress (0.0 to 1.0) based on how far all pieces have advanced
 */
const getGameProgress = (gameState) => {
  if (!gameState?.pieces) return 0;
  let totalProgress = 0;
  let totalPieces = 0;
  for (const entry of gameState.pieces) {
    for (const p of entry.pieces) {
      totalPieces++;
      if (p.state === 'home') totalProgress += 1.0;
      else if (p.state === 'home-column') totalProgress += 0.85 + (p.position / 5) * 0.15;
      else if (p.state === 'on-board') totalProgress += 0.1 + (p.position / 51) * 0.75;
      // base = 0
    }
  }
  return totalPieces > 0 ? totalProgress / totalPieces : 0;
};

/**
 * Weighted random roll using a probability table
 * probs = [p1, p2, p3, p4, p5, p6] — must sum to 1.0
 */
const weightedRoll = (probs) => {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < 6; i++) {
    cumulative += probs[i];
    if (r < cumulative) return i + 1;
  }
  return 6;
};

/**
 * rollDice — Near-Miss Rubber Band System
 *
 * Real match (isBotMatch=false): Pure random, truly fair
 *
 * Bot match (isBotMatch=true, bot destined to win):
 *   EARLY game  → User gets great dice (feels like winning!)
 *   MID game    → Balanced, competitive
 *   LATE game   → Bot gets amazing dice, user gets bad → dramatic comeback, user loses at end
 *
 * Bot match (user destined to win):
 *   Normal to good dice for user throughout
 */
const rollDice = (isBotMatch = false, isRollerBot = false, botDestinedToWin = false, gameState = null) => {
  if (!isBotMatch) {
    return trueRandom(); // Real online match — completely fair
  }

  const progress = getGameProgress(gameState);

  // Define game phases based on overall progress
  const isEarly = progress < 0.25;  // 0-25% — early, pieces just opening
  const isMid   = progress < 0.60;  // 25-60% — mid game, competitive
  // Late game = progress >= 0.60

  if (botDestinedToWin) {
    if (isRollerBot) {
      // BOT rolling in bot-destined game
      if (isEarly) {
        // Early: bot gets AVERAGE rolls so user feels ahead
        return weightedRoll([0.18, 0.18, 0.18, 0.18, 0.17, 0.11]); // 11% chance of 6
      } else if (isMid) {
        // Mid: bot gets slightly better, game feels close
        return weightedRoll([0.12, 0.15, 0.17, 0.18, 0.18, 0.20]); // 20% chance of 6
      } else {
        // LATE: bot gets AMAZING dice — dramatic comeback!
        return weightedRoll([0.04, 0.06, 0.10, 0.16, 0.24, 0.40]); // 40% chance of 6!
      }
    } else {
      // USER rolling in bot-destined game
      if (isEarly) {
        // Early: user gets GREAT dice — they feel powerful and ahead
        return weightedRoll([0.04, 0.08, 0.14, 0.20, 0.24, 0.30]); // 30% chance of 6!
      } else if (isMid) {
        // Mid: user gets decent rolls — still competitive
        return weightedRoll([0.12, 0.15, 0.18, 0.20, 0.18, 0.17]); // 17% chance of 6
      } else {
        // LATE: user gets BAD dice — "so close but so far!"
        return weightedRoll([0.30, 0.25, 0.18, 0.14, 0.08, 0.05]); // 5% chance of 6
      }
    }
  } else {
    // User destined to win — give user consistent good rolls throughout
    if (isRollerBot) {
      return weightedRoll([0.20, 0.20, 0.18, 0.16, 0.14, 0.12]); // 12% chance of 6
    } else {
      return weightedRoll([0.06, 0.10, 0.16, 0.20, 0.22, 0.26]); // 26% chance of 6
    }
  }
};

module.exports = {
  calculateNewPosition,
  getMovablePieces,
  hasAnyMove,
  createInitialGameState,
  findPiece,
  findKillTarget,
  allPiecesHome,
  nextTurnColor,
  rollDice,
  toAbsolute,
};
