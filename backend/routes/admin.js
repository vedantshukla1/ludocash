const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Settings = require('../models/Settings');
const { adminAuth, signAdminToken } = require('../middleware/auth');
const { createPayout } = require('../services/paymentService');
const { restoreWithdrawable } = require('../services/walletService');
const { isDbConnected } = require('../config/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signAdminToken(username);
  res.json({ token, username });
});

router.use(adminAuth);

router.get('/dashboard', async (req, res) => {
  const emptyDashboard = () => ({
    stats: {
      totalUsers: 0,
      activeGames: 0,
      pendingWithdrawals: 0,
      recentSignups: 0,
      revenue: { today: 0, week: 0, month: 0 },
    },
    charts: { dailyRevenue: [], dailySignups: [], dailyGames: [] },
    liveGames: [],
  });

  if (!isDbConnected()) {
    return res.json(emptyDashboard());
  }

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeGames,
      pendingWithdrawals,
      recentSignups,
      revenueToday,
      revenueWeek,
      revenueMonth,
      dailyRevenue,
      dailySignups,
      dailyGames,
      liveGames,
    ] = await Promise.all([
      User.countDocuments(),
      Game.countDocuments({ status: 'active' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Transaction.aggregate([
        { $match: { type: 'entry_fee', status: 'completed', createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { type: 'entry_fee', status: 'completed', createdAt: { $gte: weekAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { type: 'entry_fee', status: 'completed', createdAt: { $gte: monthAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            type: 'entry_fee',
            status: 'completed',
            createdAt: { $gte: weekAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Game.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: weekAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Game.find({ status: 'active' })
        .populate('players.userId', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const settings = await Settings.getPlatform();
    const cut = (settings.platformCut || 10) / 100;
    const applyCut = (v) => Math.round((v || 0) * cut);

    res.json({
      stats: {
        totalUsers,
        activeGames,
        pendingWithdrawals,
        recentSignups,
        revenue: {
          today: applyCut(revenueToday[0]?.total),
          week: applyCut(revenueWeek[0]?.total),
          month: applyCut(revenueMonth[0]?.total),
        },
      },
      charts: { dailyRevenue, dailySignups, dailyGames },
      liveGames,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const filter = {};

    if (req.query.search) {
      const q = req.query.search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-password -refreshToken')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ users, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [transactions, games] = await Promise.all([
      Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
      Game.find({ 'players.userId': user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.json({ user, transactions, games });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

router.put('/users/:id/block', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isBlocked = !!req.body.isBlocked;
    if (user.isBlocked) user.refreshToken = null;
    await user.save();

    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.put('/users/:id/wallet', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const adjustment = parseFloat(req.body.adjustment);
    const reason = req.body.reason || 'Admin adjustment';
    if (isNaN(adjustment)) return res.status(400).json({ error: 'Invalid adjustment amount' });

    const user = await User.findById(req.params.id).session(session);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.wallet.balance += adjustment;
    if (adjustment > 0) user.wallet.withdrawable += adjustment;
    else user.wallet.withdrawable = Math.max(0, user.wallet.withdrawable + adjustment);
    await user.save({ session });

    await Transaction.create(
      [{
        userId: user._id,
        type: 'adjustment',
        amount: Math.abs(adjustment),
        status: 'completed',
        meta: { reason, direction: adjustment >= 0 ? 'credit' : 'debit' },
      }],
      { session },
    );

    await session.commitTransaction();
    res.json({ wallet: user.wallet });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: 'Wallet adjustment failed' });
  } finally {
    session.endSession();
  }
});

router.get('/games', async (req, res) => {
  try {
    const status = req.query.status;
    const filter = status ? { status } : {};
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

    const [games, total] = await Promise.all([
      Game.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('players.userId', 'name avatar')
        .populate('winner', 'name')
        .lean(),
      Game.countDocuments(filter),
    ]);

    res.json({ games, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load games' });
  }
});

router.get('/games/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('players.userId', 'name avatar email')
      .populate('winner', 'name')
      .lean();
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json({ game });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load game' });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const filter = {};

    if (req.query.type) filter.type = req.query.type;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email')
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({ transactions, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

router.get('/transactions/export/csv', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .populate('userId', 'name email')
      .lean();

    const header = 'ID,User,Email,Type,Amount,Status,Date\n';
    const rows = transactions.map((t) =>
      [
        t._id,
        t.userId?.name || '',
        t.userId?.email || '',
        t.type,
        t.amount,
        t.status,
        new Date(t.createdAt).toISOString(),
      ].join(','),
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(header + rows);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/withdrawals', async (req, res) => {
  try {
    const status = req.query.status;
    const filter = status ? { status } : {};
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email')
        .lean(),
      Withdrawal.countDocuments(filter),
    ]);

    res.json({ withdrawals, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load withdrawals' });
  }
});

const processWithdrawalApproval = async (withdrawal) => {
  try {
    const payout = await createPayout(
      withdrawal.upiId,
      withdrawal.amount,
      withdrawal._id.toString(),
    );

    withdrawal.status = 'completed';
    withdrawal.razorpayPayoutId = payout.id;
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    await Transaction.updateOne(
      { 'meta.withdrawalId': withdrawal._id },
      { status: 'completed' },
    );
  } catch (err) {
    withdrawal.status = 'failed';
    withdrawal.processedAt = new Date();
    await withdrawal.save();
    await restoreWithdrawable(withdrawal.userId, withdrawal.amount);
    await Transaction.updateOne(
      { 'meta.withdrawalId': withdrawal._id },
      { status: 'failed' },
    );
    throw err;
  }
};

router.put('/withdrawals/:id/approve', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed' });
    }

    await processWithdrawalApproval(withdrawal);
    res.json({ withdrawal });
  } catch (err) {
    res.status(500).json({ error: 'Payout failed' });
  }
});

router.put('/withdrawals/:id/reject', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed' });
    }

    withdrawal.status = 'rejected';
    withdrawal.rejectionReason = req.body.reason || 'Rejected by admin';
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    await restoreWithdrawable(withdrawal.userId, withdrawal.amount);
    await Transaction.updateOne(
      { 'meta.withdrawalId': withdrawal._id },
      { status: 'rejected' },
    );

    res.json({ withdrawal });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed' });
  }
});

router.post('/withdrawals/bulk-approve', async (req, res) => {
  try {
    const ids = req.body.ids || [];
    const results = [];

    for (const id of ids) {
      try {
        const withdrawal = await Withdrawal.findById(id);
        if (withdrawal && withdrawal.status === 'pending') {
          await processWithdrawalApproval(withdrawal);
          results.push({ id, status: 'completed' });
        }
      } catch (err) {
        results.push({ id, status: 'failed' });
      }
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Bulk approve failed' });
  }
});

router.get('/revenue', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [entryFees, platformCuts] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: 'entry_fee', status: 'completed', createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Game.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            platformCut: { $sum: '$platformCut' },
            prizePool: { $sum: '$prizePool' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ entryFees, platformCuts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load revenue' });
  }
});

router.get('/settings', async (req, res) => {
  const settings = await Settings.getPlatform();
  res.json({ settings });
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await Settings.getPlatform();
    const {
      platformCut,
      maintenanceMode,
      minWithdrawal,
      maxWithdrawal,
      announcement,
      modeCuts,
    } = req.body;

    if (platformCut !== undefined) settings.platformCut = platformCut;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (minWithdrawal !== undefined) settings.minWithdrawal = minWithdrawal;
    if (maxWithdrawal !== undefined) settings.maxWithdrawal = maxWithdrawal;
    if (announcement !== undefined) settings.announcement = announcement;
    if (modeCuts) settings.modeCuts = { ...settings.modeCuts, ...modeCuts };

    await settings.save();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
