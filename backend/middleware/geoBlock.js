const { BLOCKED_STATES } = require('../config/constants');

const geoBlock = (req, res, next) => {
  if (!req.user?.state) return next();

  if (BLOCKED_STATES.includes(req.user.state)) {
    return res.status(403).json({
      error: 'Real-money gaming is not available in your region',
      reason: 'geo-block',
    });
  }

  next();
};

module.exports = geoBlock;
