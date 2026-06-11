const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getSecret = () => process.env.JWT_SECRET || 'ludocash-dev-secret';

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, getSecret());
    const user = await User.findById(decoded.userId);

    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.isBlocked) return res.status(403).json({ error: 'Account blocked' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, getSecret());
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = { username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
};

const signUserTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRY || '7d',
  });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, getSecret(), {
    expiresIn: process.env.REFRESH_EXPIRY || '30d',
  });
  return { accessToken, refreshToken };
};

const signAdminToken = (username) =>
  jwt.sign({ username, isAdmin: true }, getSecret(), { expiresIn: '12h' });

module.exports = { auth, adminAuth, signUserTokens, signAdminToken, getSecret };
