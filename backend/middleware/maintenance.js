const Settings = require('../models/Settings');

let cachedMaintenance = false;
let cacheTime = 0;

const maintenance = async (req, res, next) => {
  const now = Date.now();
  if (now - cacheTime > 30000) {
    try {
      const settings = await Settings.getPlatform();
      cachedMaintenance = settings.maintenanceMode;
      cacheTime = now;
    } catch (_) {
      cachedMaintenance = false;
    }
  }

  if (cachedMaintenance) {
    return res.status(503).json({ error: 'Platform is under maintenance' });
  }

  next();
};

module.exports = maintenance;
