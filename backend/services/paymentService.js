const crypto = require('crypto');
const Razorpay = require('razorpay');

let razorpay = null;
const pendingOrders = new Map();

const initRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (keyId && keySecret) {
    razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
};

const isConfigured = () => !!razorpay;

const createOrder = async (amount, userId) => {
  if (!razorpay) {
    const orderId = `order_mock_${Date.now()}_${userId}`;
    pendingOrders.set(orderId, { amount, userId: userId.toString() });
    return {
      orderId,
      amount: Math.round(amount * 100),
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
      mock: true,
    };
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `dep_${userId.toString().slice(-8)}_${Date.now()}`,
  });

  pendingOrders.set(order.id, { amount, userId: userId.toString() });

  return {
    orderId: order.id,
    amount: order.amount,
    key: process.env.RAZORPAY_KEY_ID,
    mock: false,
  };
};

const getPendingOrder = (orderId) => {
  return pendingOrders.get(orderId);
};

const verifyPaymentSignature = (orderId, paymentId, signature) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return signature === 'mock_signature' || !!paymentId;
  }

  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expected === signature;
};

const verifyWebhookSignature = (body, signature) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};

const createPayout = async (upiId, amount, referenceId) => {
  if (!razorpay) {
    return { id: `payout_mock_${referenceId}`, status: 'processed', mock: true };
  }

  const contact = await razorpay.contacts.create({
    name: 'LudoCash User',
    email: 'payout@ludocash.com',
    contact: '9999999999',
    type: 'customer',
    reference_id: referenceId,
  });

  const fundAccount = await razorpay.fundAccount.create({
    contact_id: contact.id,
    account_type: 'vpa',
    vpa: { address: upiId },
  });

  const payout = await razorpay.payouts.create({
    account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
    fund_account_id: fundAccount.id,
    amount: Math.round(amount * 100),
    currency: 'INR',
    mode: 'UPI',
    purpose: 'payout',
    queue_if_low_balance: true,
    reference_id: referenceId,
  });

  return payout;
};

module.exports = {
  initRazorpay,
  isConfigured,
  createOrder,
  getPendingOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  createPayout,
};
