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
  if (pool.length === 0) pools.delete(key);

  const settings = await Settings.getPlatform();
  const cutPercent = settings.modeCuts?.[mode] ?? config.defaultCut;
  const totalPot = fee * config.players;
  const platformCut = Math.round(totalPot * (cutPercent / 100));
  const prizePool = totalPot - platformCut;

  const freshUsers = [];
  for (const entry of matched) {
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

  const colors = COLORS_ORDER.slice(0, config.players);
  const gameState = createInitialGameState(colors);

  const game = await Game.create({
    mode,
    entryFee: fee,
    prizePool,
    platformCut,
    status: 'active',
    players: freshUsers.map(({ entry, user }, i) => ({
      userId: user._id,
      color: colors[i],
      name: user.name,
      avatar: user.avatar,
    })),
    gameState,
    events: [{ type: 'game_started', at: new Date() }],
  });

  for (const { user } of freshUsers) {
    try {
      await deductEntryFee(user._id, fee, game._id);
    } catch (err) {
      await Game.findByIdAndUpdate(game._id, { status: 'cancelled' });
      freshUsers.forEach(({ entry }) => {
        io.to(entry.socketId).emit('error_event', { message: 'Failed to deduct entry fee' });
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
      active.sockets[user._id.toString()] = entry.socketId;
    }

    io.to(entry.socketId).emit('game_found', gameData);
    entry.socket.join(`game:${game._id}`);
  });

  const { startTurnTimer } = require('./gameHandler');
  startTurnTimer(game._id.toString());

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
    if (pool.length === 0) pools.delete(key);
    await broadcastWaitingCount(io, mode, fee);
  }
};

const handleDisconnectFromPools = async (socket, io) => {
  for (const [key, pool] of pools.entries()) {
    const idx = pool.findIndex((p) => p.socketId === socket.id);
    if (idx !== -1) {
      pool.splice(idx, 1);
      if (pool.length === 0) pools.delete(key);
      else {
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
