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

    socket.on('join_pool', (data) => handleJoinPool(socket, io, data));
    socket.on('cancel_pool', (data) => handleCancelPool(socket, io, data));
    socket.on('leave_pool', (data) => handleCancelPool(socket, io, data));

    socket.on('roll_dice', (data) => handleRollDice(socket, data));
    socket.on('move_piece', (data) => handleMovePiece(socket, data));
    socket.on('send_emoji', (data) => handleSendEmoji(socket, data));
    socket.on('reconnect_game', (data) => handleReconnectGame(socket, data));

    socket.on('disconnect', () => {
      handleDisconnectFromPools(socket, io);
      handleGameDisconnect(socket, io);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;
