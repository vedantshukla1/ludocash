const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { auth, signUserTokens } = require('../middleware/auth');
const geoBlock = require('../middleware/geoBlock');
const validate = require('../middleware/validate');
const { BLOCKED_STATES, WELCOME_BONUS, DAILY_BONUS } = require('../config/constants');
const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const issueAuthResponse = async (user, res) => {
  const { accessToken, refreshToken } = signUserTokens(user._id.toString());
  user.refreshToken = refreshToken;
  await user.save();
  res.json({ accessToken, refreshToken, user: user.toPublicJSON() });
};

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, referralCode } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(400).json({ error: 'Email already registered' });

      // Generate a unique referral code for the new user
      const crypto = require('crypto');
      const newReferralCode = crypto.randomBytes(3).toString('hex').toUpperCase() + Math.floor(10 + Math.random() * 90);

      let referrer = null;
      let initialBonus = WELCOME_BONUS;

      if (referralCode) {
        referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
        if (referrer) {
          initialBonus += 50; // Extra Rs 50 for the new user using a referral
        }
      }

      const hashed = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashed,
        referralCode: newReferralCode,
        referredBy: referrer ? referrer._id : undefined,
        wallet: { balance: initialBonus, withdrawable: 0, bonus: initialBonus },
      });

      const Transaction = require('../models/Transaction');
      await Transaction.create({
        userId: user._id,
        type: 'bonus',
        amount: initialBonus,
        status: 'completed',
        meta: { reason: referrer ? 'welcome_bonus_with_referral' : 'welcome_bonus' },
      });

      // Give referrer their bonus
      if (referrer) {
        referrer.wallet.bonus += 50;
        referrer.wallet.balance += 50;
        referrer.referralsCount += 1;
        await referrer.save();

        await Transaction.create({
          userId: referrer._id,
          type: 'bonus',
          amount: 50,
          status: 'completed',
          meta: { reason: 'referral_bonus', referredUserId: user._id },
        });
      }

      const fresh = await User.findById(user._id);
      await issueAuthResponse(fresh, res);
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  },
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!user.password) return res.status(400).json({ error: 'Use Google sign-in for this account' });
      if (user.isBlocked) return res.status(403).json({ error: 'Account blocked' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      await issueAuthResponse(user, res);
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  },
);

router.post('/google', async (req, res) => {
  try {
    const { idToken, name, email, state, avatar } = req.body;
    if (!idToken || !email) {
      return res.status(400).json({ error: 'Google token and email required' });
    }

    let googleId = null;
    if (process.env.GOOGLE_CLIENT_ID) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      googleId = payload.sub;
    } else {
      googleId = `dev_${email}`;
    }

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });
    const isNew = !user;

    if (isNew) {
      if (state && BLOCKED_STATES.includes(state)) {
        return res.status(403).json({
          error: `Real-money gaming is not available in ${state}`,
          reason: 'geo-block',
        });
      }

      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        avatar: avatar || '',
        state: state || '',
        wallet: { balance: WELCOME_BONUS, withdrawable: 0, bonus: WELCOME_BONUS },
      });

      const Transaction = require('../models/Transaction');
      await Transaction.create({
        userId: user._id,
        type: 'bonus',
        amount: WELCOME_BONUS,
        status: 'completed',
        meta: { reason: 'welcome_bonus' },
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (avatar) user.avatar = avatar;
      if (name) user.name = name;
      await user.save();
    }

    if (user.isBlocked) return res.status(403).json({ error: 'Account blocked' });

    await issueAuthResponse(user, res);
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Google login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const jwt = require('jsonwebtoken');
    const { getSecret } = require('../middleware/auth');
    const decoded = jwt.verify(refreshToken, getSecret());

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = signUserTokens(user._id.toString());
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', auth, geoBlock, async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

router.post('/daily-bonus', auth, geoBlock, async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();

    if (user.dailyBonusLastClaimed) {
      const last = new Date(user.dailyBonusLastClaimed);
      if (
        last.getDate() === now.getDate() &&
        last.getMonth() === now.getMonth() &&
        last.getFullYear() === now.getFullYear()
      ) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return res.status(400).json({
          error: 'Daily bonus already claimed',
          nextClaimAt: tomorrow,
        });
      }
    }

    user.wallet.balance += DAILY_BONUS;
    user.wallet.bonus += DAILY_BONUS;
    user.dailyBonusLastClaimed = now;
    await user.save();

    const Transaction = require('../models/Transaction');
    await Transaction.create({
      userId: user._id,
      type: 'bonus',
      amount: DAILY_BONUS,
      status: 'completed',
      meta: { reason: 'daily_bonus' },
    });

    res.json({ bonus: DAILY_BONUS, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to claim daily bonus' });
  }
});

router.put(
  '/profile',
  auth,
  [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, phone, avatar } = req.body;
      if (name) req.user.name = name;
      if (phone !== undefined) req.user.phone = phone;
      if (avatar !== undefined) req.user.avatar = avatar;
      await req.user.save();
      res.json({ user: req.user.toPublicJSON() });
    } catch (err) {
      res.status(500).json({ error: 'Profile update failed' });
    }
  },
);

module.exports = router;
