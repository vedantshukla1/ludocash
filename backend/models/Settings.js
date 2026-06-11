const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'platform' },
    platformCut: { type: Number, default: 10 },
    maintenanceMode: { type: Boolean, default: false },
    minWithdrawal: { type: Number, default: 100 },
    maxWithdrawal: { type: Number, default: 50000 },
    announcement: { type: String, default: '' },
    modeCuts: {
      '2player': { type: Number, default: 10 },
      '4player': { type: Number, default: 15 },
      tournament: { type: Number, default: 20 },
    },
  },
  { timestamps: true },
);

settingsSchema.statics.getPlatform = async function getPlatform() {
  let settings = await this.findOne({ key: 'platform' });
  if (!settings) {
    settings = await this.create({ key: 'platform' });
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
