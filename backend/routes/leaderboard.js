const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const period = req.query.period || 'alltime';

    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weekly = await Transaction.aggregate([
        {
          $match: {
            type: 'winning',
            status: 'completed',
            createdAt: { $gte: weekAgo },
          },
        },
        {
          $group: {
            _id: '$userId',
            totalWinnings: { $sum: '$amount' },
          },
        },
        { $sort: { totalWinnings: -1 } },
        { $limit: 50 },
      ]);

      const userIds = weekly.map((w) => w._id);
      const users = await User.find({ _id: { $in: userIds } }).select('name avatar stats').lean();
      const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

      const leaderboard = weekly.map((w, i) => ({
        rank: i + 1,
        userId: w._id,
        name: userMap[w._id.toString()]?.name || 'Player',
        avatar: userMap[w._id.toString()]?.avatar || '',
        totalWinnings: w.totalWinnings,
        wins: userMap[w._id.toString()]?.stats?.wins || 0,
      }));

      return res.json({ leaderboard, period });
    }

    const users = await User.find({ 'stats.totalEarnings': { $gt: 0 } })
      .sort({ 'stats.totalEarnings': -1 })
      .limit(50)
      .select('name avatar stats')
      .lean();

    const leaderboard = users.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      name: u.name,
      avatar: u.avatar,
      totalWinnings: u.stats.totalEarnings,
      wins: u.stats.wins,
    }));

    res.json({ leaderboard, period: 'alltime' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

module.exports = router;
