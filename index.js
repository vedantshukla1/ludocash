const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getSecret } = require('../middleware/auth');
const { BLOCKED_STATES } = require('../config/constants');
const {
  handleJoinPool,
  handleCancelPool,
  handleDisconnectFromPools,
} = require('./matchmaking');
const {
  handleRollDice,
  handleMovePiece,
  handleSendEmoji,
  handleReconnectGame,
  handleGameDisconnect,
  getActiveGameByUserId,
  handleLeaveGame,
} = require('./gameHandler');

const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, getSecret());
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      if (user.isBlocked) return next(new Error('Account blocked'));
      if (user.state && BLOCKED_STATES.includes(user.state)) {
        return next(new Error('Geo-blocked'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);
    
    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Check for active game on connection
    const active = getActiveGameByUserId(socket.userId);
    if (active) {
      active.sockets[socket.userId] = socket.id;
      const player = active.game.players.find((p) => p.userId.toString() === socket.userId);
      if (player) player.disconnected = false;
      socket.join(`game:${active.game._id}`);

      const gameData = {
        gameId: active.game._id.toString(),
        mode: active.game.mode,
        entryFee: active.game.entryFee,
        prizePool: active.game.prizePool,
        players: active.game.players.map((p) => ({
          userId: p.userId,
          color: p.color,
          name: p.name,
          avatar: p.avatar,
        })),
        gameState: active.gameState,
        isWaitingToStart: active.isWaitingToStart || false,
        countdownVal: active.countdown || 0,
      };
      
      socket.emit('game_found', gameData);
    }

    socket.on('join_pool', (data) => handleJoinPool(socket, io, data));
    socket.on('cancel_pool', (data) => handleCancelPool(socket, io, data));
    socket.on('leave_pool', (data) => handleCancelPool(socket, io, data));

    socket.on('roll_dice', (data) => handleRollDice(socket, data));
    socket.on('move_piece', (data) => handleMovePiece(socket, data));
    socket.on('send_emoji', (data) => handleSendEmoji(socket, data));
    socket.on('reconnect_game', (data) => handleReconnectGame(socket, data));
    socket.on('leave_game', (data) => handleLeaveGame(socket, data));

    socket.on('disconnect', () => {
      handleDisconnectFromPools(socket, io);
      handleGameDisconnect(socket, io);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;
