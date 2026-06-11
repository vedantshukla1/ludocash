const express = require('express');
const Game = require('../models/Game');
const { auth } = require('../middleware/auth');
const geoBlock = require('../middleware/geoBlock');

const router = express.Router();

router.use(auth, geoBlock);

router.get('/history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

    const filter = {
      'players.userId': req.user._id,
      status: 'completed',
    };

    const [games, total] = await Promise.all([
      Game.find(filter)
        .sort({ completedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('winner', 'name avatar')
        .lean(),
      Game.countDocuments(filter),
    ]);

    res.json({ games, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load game history' });
  }
});

router.get('/active/current', async (req, res) => {
  try {
    const game = await Game.findOne({
      'players.userId': req.user._id,
      status: 'active',
    }).lean();

    res.json({ game });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check active game' });
  }
});

router.get('/waiting-count/:mode/:fee', async (req, res) => {
  try {
    const { getPoolCount } = require('../socket/matchmaking');
    const count = getPoolCount(req.params.mode, parseInt(req.params.fee, 10));
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
  }
});

router.get('/:gameId', async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId)
      .populate('players.userId', 'name avatar')
      .populate('winner', 'name avatar')
      .lean();

    if (!game) return res.status(404).json({ error: 'Game not found' });

    const isPlayer = game.players.some(
      (p) => p.userId?._id?.toString() === req.user._id.toString() ||
        p.userId?.toString() === req.user._id.toString(),
    );
    if (!isPlayer) return res.status(403).json({ error: 'Access denied' });

    res.json({ game });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load game' });
  }
});

module.exports = router;
