const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const geoBlock = require('../middleware/geoBlock');
const validate = require('../middleware/validate');
const Settings = require('../models/Settings');
const Transaction = require('../models/Transaction');
const { createOrder, getPendingOrder, verifyPaymentSignature } = require('../services/paymentService');
const { creditDeposit, createWithdrawalHold } = require('../services/walletService');

const router = express.Router();

router.use(auth, geoBlock);

router.post(
  '/create-order',
  [body('amount').isFloat({ min: 10, max: 100000 }).withMessage('Amount must be between ₹10 and ₹1,00,000')],
  validate,
  async (req, res) => {
    try {
      const amount = parseFloat(req.body.amount);
      const order = await createOrder(amount, req.user._id);
      res.json(order);
    } catch (err) {
      console.error('Create order error:', err);
      res.status(500).json({ error: 'Failed to create payment order' });
    }
  },
);

router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const valid = verifyPaymentSignature(orderId, paymentId, signature);
    if (!valid) return res.status(400).json({ error: 'Payment verification failed' });

    const existing = await Transaction.findOne({ razorpayOrderId: orderId });
    if (existing) {
      const user = await require('../models/User').findById(req.user._id);
      return res.json({ success: true, user: user.toPublicJSON(), duplicate: true });
    }

    const pendingOrder = getPendingOrder(orderId);
    const depositAmount = pendingOrder?.amount || parseFloat(req.body.amount) || 100;

    if (pendingOrder && pendingOrder.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Order does not belong to this user' });
    }

    const result = await creditDeposit(req.user._id, depositAmount, orderId, paymentId);
    if (result.duplicate) {
      return res.json({ success: true, user: result.user?.toPublicJSON?.() || req.user.toPublicJSON() });
    }

    res.json({
      success: true,
      user: result.user.toPublicJSON(),
      bonusAmount: result.bonusAmount,
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

router.post(
  '/withdraw',
  [
    body('amount').isFloat({ min: 1 }).withMessage('Valid amount required'),
    body('upiId').trim().notEmpty().withMessage('UPI ID required'),
  ],
  validate,
  async (req, res) => {
    try {
      const amount = parseFloat(req.body.amount);
      const { upiId } = req.body;

      if (!req.user.stats || req.user.stats.gamesPlayed === 0) {
        return res.status(400).json({ error: 'You must play at least 1 real match before withdrawing funds.' });
      }

      const settings = await Settings.getPlatform();

      if (amount < settings.minWithdrawal) {
        return res.status(400).json({ error: `Minimum withdrawal is ₹${settings.minWithdrawal}` });
      }
      if (amount > settings.maxWithdrawal) {
        return res.status(400).json({ error: `Maximum withdrawal is ₹${settings.maxWithdrawal}` });
      }

      const { user, withdrawal } = await createWithdrawalHold(req.user._id, amount, upiId);
      res.json({
        success: true,
        withdrawal,
        user: user.toPublicJSON(),
      });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Withdrawal failed' });
    }
  },
);

router.get('/balance', async (req, res) => {
  res.json({ wallet: req.user.wallet });
});

router.get('/transactions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const filter = { userId: req.user._id };

    if (req.query.type && req.query.type !== 'all') {
      const typeMap = { withdraw: 'withdrawal' };
      filter.type = typeMap[req.query.type] || req.query.type;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

module.exports = router;
