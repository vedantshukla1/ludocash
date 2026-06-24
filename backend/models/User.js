const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    balance: { type: Number, default: 0 },
    withdrawable: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
  },
  { _id: false },
);

const statsSchema = new mongoose.Schema(
  {
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    netWinningsFY: { type: Number, default: 0 },
    financialYear: { type: String, default: '' },
    totalWithdrawn: { type: Number, default: 0 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    googleId: { type: String, sparse: true },
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' },
    wallet: { type: walletSchema, default: () => ({}) },
    stats: { type: statsSchema, default: () => ({}) },
    state: { type: String, default: '' },
    isBlocked: { type: Boolean, default: false },
    dailyBonusLastClaimed: { type: Date },
    refreshToken: { type: String },
  },
  { timestamps: true },
);

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    avatar: this.avatar,
    wallet: this.wallet,
    stats: this.stats,
    state: this.state,
    isBlocked: this.isBlocked,
    dailyBonusLastClaimed: this.dailyBonusLastClaimed,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
