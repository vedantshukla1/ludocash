const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    color: { type: String, required: true },
    name: { type: String, default: '' },
    avatar: { type: String, default: '' },
    disconnected: { type: Boolean, default: false },
  },
  { _id: false },
);

const gameSchema = new mongoose.Schema(
  {
    mode: { type: String, required: true },
    entryFee: { type: Number, required: true },
    prizePool: { type: Number, default: 0 },
    platformCut: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['waiting', 'active', 'completed', 'cancelled'],
      default: 'waiting',
    },
    players: [playerSchema],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gameState: { type: mongoose.Schema.Types.Mixed, default: {} },
    events: [{ type: mongoose.Schema.Types.Mixed }],
    completedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Game', gameSchema);
