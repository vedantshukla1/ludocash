const mongoose = require('mongoose');
const User = require('../models/User');
const Game = require('../models/Game');
const Settings = require('../models/Settings');
const { MODE_CONFIG, COLORS_ORDER } = require('../config/constants');
const { createInitialGameState } = require('../services/gameEngine');
const { deductEntryFee } = require('../services/walletService');
const { registerActiveGame } = require('./gameHandler');

const pools = new Map();

const poolKey = (mode, fee) => `${mode}:${fee}`;

const getPoolCount = (mode, fee) => {
  const pool = pools.get(poolKey(mode, fee));
  return pool ? pool.length : 0;
};

const generateBotEntry = () => {
  const names = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Neha', 'Rohan', 'Pooja', 'Karan', 'Aarti'];
  const name = names[Math.floor(Math.random() * names.length)];
  const botId = new mongoose.Types.ObjectId().toString();
  return {
    userId: botId,
    socketId: `bot_socket_${Date.now()}`,
    socket: null,
    isBot: true,
    botProfile: { name, avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${name}` },
  };
};

const broadcastWaitingCount = async (io, mode, fee) => {
  const pool = pools.get(poolKey(mode, fee)) || [];
  const count = pool.length;
  
  const users = [];
  for (const entry of pool) {
    try {
      const user = await User.findById(entry.userId).select('name avatar');
      if (user) {
        users.push({
          userId: user._id.toString(),
          name: user.name,
          avatar: user.avatar,
        });
      } else if (entry.isBot) {
        users.push({
          userId: entry.userId,
          name: entry.botProfile.name,
          avatar: entry.botProfile.avatar,
        });
      }
    } catch (err) {
      console.error('Error fetching user for pool info:', err);
    }
  }

  pool.forEach((entry) => {
    io.to(entry.socketId).emit('waiting_count', { count, users });
  });
};

const removeFromAllPools = (userId) => {
  for (const [key, pool] of pools.entries()) {
    const idx = pool.findIndex((p) => p.userId === userId);
    if (idx !== -1) {
      pool.splice(idx, 1);
      if (pool.length === 0) pools.delete(key);
      else {
        const [mode, fee] = key.split(':');
        return { mode, fee: parseInt(fee, 10) };
      }
    }
  }
  return null;
};

const tryStartMatch = async (io, mode, fee) => {
  const key = poolKey(mode, fee);
  const pool = pools.get(key);
  if (!pool) return;

  const config = MODE_CONFIG[mode];
  if (!config || pool.length < config.players) return;

  const matched = pool.splice(0, config.players);
  if (pool.length === 0) {
    if (pool.botTimeout) clearTimeout(pool.botTimeout);
    pools.delete(key);
  }

  const settings = await Settings.getPlatform();
  const cutPercent = settings.modeCuts?.[mode] ?? config.defaultCut;
  const totalPot = fee * config.players;
  const platformCut = Math.round(totalPot * (cutPercent / 100));
  const prizePool = totalPot - platformCut;

  const freshUsers = [];
  for (const entry of matched) {
    if (entry.isBot) {
      const fakeBotUser = {
        _id: entry.userId,
        name: entry.botProfile.name,
        avatar: entry.botProfile.avatar,
        wallet: { balance: fee }
      };
      freshUsers.push({ entry, user: fakeBotUser });
      continue;
    }
    const user = await User.findById(entry.userId);
    if (!user || user.wallet.balance < fee) {
      io.to(entry.socketId).emit('insufficient_balance', {
        required: fee,
        current: user?.wallet?.balance || 0,
      });
      continue;
    }
    freshUsers.push({ entry, user });
  }

  if (freshUsers.length < config.players) {
    freshUsers.forEach(({ entry }) => {
      pool.push(entry);
      pools.set(key, pool);
    });
    await broadcastWaitingCount(io, mode, fee);
    return;
  }

  let colors;
  if (config.players === 2) {
    colors = ['blue', 'green'];
  } else if (config.players === 3) {
    colors = ['red', 'blue', 'green'];
  } else {
    colors = COLORS_ORDER.slice(0, config.players);
  }
  const gameState = createInitialGameState(colors);

  const playerObjects = freshUsers.map(({ entry, user }, i) => ({
    userId: user._id,
    color: colors[i],
    name: user.name,
    avatar: user.avatar,
    isBot: entry.isBot || false,
  }));

  const botPlayers = playerObjects.filter(p => p.isBot);
  const isBotMatch = botPlayers.length > 0;
  let destinedWinnerColor = null;

  if (isBotMatch) {
    if (Math.random() < 0.65) {
      const randomBot = botPlayers[Math.floor(Math.random() * botPlayers.length)];
      destinedWinnerColor = randomBot.color;
    } else {
      const userPlayers = playerObjects.filter(p => !p.isBot);
      if (userPlayers.length > 0) {
        const randomUser = userPlayers[Math.floor(Math.random() * userPlayers.length)];
        destinedWinnerColor = randomUser.color;
      }
    }
  }

  const game = await Game.create({
    mode,
    entryFee: fee,
    prizePool,
    platformCut,
    status: 'active',
    players: playerObjects,
    gameState,
    isBotMatch,
    destinedWinnerColor,
    events: [{ type: 'game_started', at: new Date() }],
  });

  for (const { entry, user } of freshUsers) {
    try {
      if (!entry.isBot) {
        await deductEntryFee(user._id, fee, game._id);
      }
    } catch (err) {
      await Game.findByIdAndUpdate(game._id, { status: 'cancelled' });
      freshUsers.forEach(({ entry: e }) => {
        if (!e.isBot) {
          io.to(e.socketId).emit('error_event', { message: 'Failed to deduct entry fee' });
        }
      });
      return;
    }
  }

  const gameData = {
    gameId: game._id.toString(),
    mode,
    entryFee: fee,
    prizePool,
    players: game.players.map((p) => ({
      userId: p.userId,
      color: p.color,
      name: p.name,
      avatar: p.avatar,
    })),
    gameState,
    isWaitingToStart: true,
    countdownVal: 5,
  };

  registerActiveGame(game._id.toString(), {
    game,
    gameState,
    io,
    turnTimer: null,
    sockets: {},
  });

  freshUsers.forEach(({ entry, user }, i) => {
    const active = require('./gameHandler').getActiveGame(game._id.toString());
    if (active) {
      const userRoom = io.sockets.adapter.rooms.get(`user:${user._id.toString()}`);
      if (userRoom && userRoom.size > 0) {
        const [latestSocketId] = userRoom;
        active.sockets[user._id.toString()] = latestSocketId;
        const latestSocket = io.sockets.sockets.get(latestSocketId);
        if (latestSocket) {
          latestSocket.join(`game:${game._id}`);
        }
      } else {
        active.sockets[user._id.toString()] = entry.socketId;
        if (entry.socket) {
          entry.socket.join(`game:${game._id}`);
        }
      }
    }

    io.to(`user:${user._id.toString()}`).emit('game_found', gameData);
  });

  const active = require('./gameHandler').getActiveGame(game._id.toString());
  if (active) {
    active.isWaitingToStart = true;
    active.countdown = 5;

    io.to(`game:${game._id}`).emit('match_countdown', { seconds: active.countdown });

    const countdownInterval = setInterval(() => {
      const current = require('./gameHandler').getActiveGame(game._id.toString());
      if (!current) {
        clearInterval(countdownInterval);
        return;
      }

      current.countdown--;
      if (current.countdown <= 0) {
        clearInterval(countdownInterval);
        current.isWaitingToStart = false;
        io.to(`game:${game._id}`).emit('match_started');
        const { startTurnTimer } = require('./gameHandler');
        startTurnTimer(game._id.toString());
      } else {
        io.to(`game:${game._id}`).emit('match_countdown', { seconds: current.countdown });
      }
    }, 1000);

    active.countdownInterval = countdownInterval;
  }

  await broadcastWaitingCount(io, mode, fee);
};

const handleJoinPool = async (socket, io, { mode, fee }) => {
  const userId = socket.userId;
  if (!mode || !fee) {
    return socket.emit('error_event', { message: 'Invalid pool parameters' });
  }

  const config = MODE_CONFIG[mode];
  if (!config) {
    return socket.emit('error_event', { message: 'Invalid game mode' });
  }

  const user = await User.findById(userId);
  if (!user) return socket.emit('error_event', { message: 'User not found' });

  // If the user is somehow still in an active game (e.g. they left without emitting leave_game),
  // forcefully disqualify them and remove their socket from the old room before they join a new pool.
  const { getActiveGameByUserId, handleLeaveGame } = require('./gameHandler');
  const activeGame = getActiveGameByUserId(userId);
  if (activeGame) {
    await handleLeaveGame(socket, { gameId: activeGame.game._id.toString() });
  }

  if (user.wallet.balance < fee) {
    return socket.emit('insufficient_balance', {
      required: fee,
      current: user.wallet.balance,
    });
  }

  const existing = removeFromAllPools(userId);
  if (existing) await broadcastWaitingCount(io, existing.mode, existing.fee);

  const key = poolKey(mode, fee);
  const pool = pools.get(key) || [];

  if (pool.some((p) => p.userId === userId)) {
    return socket.emit('error_event', { message: 'Already in pool' });
  }

  pool.push({ userId, socketId: socket.id, socket });
  pools.set(key, pool);

  if (pool.length === 1) {
    pool.botTimeout = setTimeout(async () => {
      const currentPool = pools.get(key);
      if (currentPool && currentPool.length > 0 && currentPool.length < config.players) {
        const botsNeeded = config.players - currentPool.length;
        for (let i = 0; i < botsNeeded; i++) {
          currentPool.push(generateBotEntry());
        }
        await broadcastWaitingCount(io, mode, fee);
        await tryStartMatch(io, mode, fee);
      }
    }, 10000);
  }

  socket.emit('pool_joined', { position: pool.length });
  await broadcastWaitingCount(io, mode, fee);

  await tryStartMatch(io, mode, fee);
};

const handleCancelPool = async (socket, io, { mode, fee }) => {
  const key = poolKey(mode, fee);
  const pool = pools.get(key);
  if (!pool) return;

  const idx = pool.findIndex((p) => p.socketId === socket.id);
  if (idx !== -1) {
    pool.splice(idx, 1);
    if (pool.length === 0) {
      if (pool.botTimeout) clearTimeout(pool.botTimeout);
      pools.delete(key);
    }
    await broadcastWaitingCount(io, mode, fee);
  }
};

const handleDisconnectFromPools = async (socket, io) => {
  for (const [key, pool] of pools.entries()) {
    const idx = pool.findIndex((p) => p.socketId === socket.id);
    if (idx !== -1) {
      pool.splice(idx, 1);
      if (pool.length === 0) {
        if (pool.botTimeout) clearTimeout(pool.botTimeout);
        pools.delete(key);
      } else {
        const [mode, fee] = key.split(':');
        await broadcastWaitingCount(io, mode, parseInt(fee, 10));
      }
      break;
    }
  }
};

module.exports = {
  handleJoinPool,
  handleCancelPool,
  handleDisconnectFromPools,
  getPoolCount,
};
