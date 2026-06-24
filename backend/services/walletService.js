const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const {
  DEPOSIT_BONUS_THRESHOLD,
  DEPOSIT_BONUS_AMOUNT,
  TDS_RATE,
  TDS_THRESHOLD,
} = require('../config/constants');

const getFinancialYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 3) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
};

const ensureFinancialYear = (user) => {
  const fy = getFinancialYear();
  if (user.stats.financialYear !== fy) {
    user.stats.financialYear = fy;
    user.stats.netWinningsFY = 0;
  }
};

const creditDeposit = async (userId, amount, razorpayOrderId, razorpayPaymentId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existing = await Transaction.findOne({ razorpayOrderId }).session(session);
    if (existing) {
      await session.abortTransaction();
      return { duplicate: true, transaction: existing };
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    user.wallet.balance += amount;

    let bonusAmount = 0;
    if (amount > DEPOSIT_BONUS_THRESHOLD) {
      bonusAmount = DEPOSIT_BONUS_AMOUNT;
      user.wallet.balance += bonusAmount;
      user.wallet.bonus += bonusAmount;
    }

    await user.save({ session });

    const txn = await Transaction.create(
      [{
        userId,
        type: 'deposit',
        amount,
        status: 'completed',
        razorpayOrderId,
        razorpayPaymentId,
      }],
      { session },
    );

    if (bonusAmount > 0) {
      await Transaction.create(
        [{
          userId,
          type: 'bonus',
          amount: bonusAmount,
          status: 'completed',
          meta: { reason: 'deposit_bonus' },
        }],
        { session },
      );
    }

    await session.commitTransaction();
    return { user, transaction: txn[0], bonusAmount };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const deductEntryFee = async (userId, amount, gameId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user || user.wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    user.wallet.balance -= amount;
    await user.save({ session });

    await Transaction.create(
      [{
        userId,
        type: 'entry_fee',
        amount,
        status: 'completed',
        meta: { gameId },
      }],
      { session },
    );

    await session.commitTransaction();
    return user;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const creditWinnings = async (userId, grossAmount, gameId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    ensureFinancialYear(user);

    let tdsAmount = 0;
    const projected = user.stats.netWinningsFY + grossAmount;
    if (projected > TDS_THRESHOLD) {
      const taxableAbove = projected - Math.max(user.stats.netWinningsFY, TDS_THRESHOLD);
      tdsAmount = Math.round(taxableAbove * TDS_RATE);
    }

    const netAmount = grossAmount - tdsAmount;
    user.wallet.balance += netAmount;
    user.wallet.withdrawable += netAmount;
    user.stats.wins += 1;
    user.stats.gamesPlayed += 1;
    user.stats.totalEarnings += netAmount;
    user.stats.netWinningsFY += grossAmount;
    await user.save({ session });

    await Transaction.create(
      [{
        userId,
        type: 'winning',
        amount: netAmount,
        status: 'completed',
        meta: { gameId, grossAmount, tdsAmount },
      }],
      { session },
    );

    if (tdsAmount > 0) {
      await Transaction.create(
        [{
          userId,
          type: 'tds_deduction',
          amount: tdsAmount,
          status: 'completed',
          meta: { gameId },
        }],
        { session },
      );
    }

    await session.commitTransaction();
    return { user, netAmount, tdsAmount };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const recordLoss = async (userId, gameId) => {
  const user = await User.findById(userId);
  if (!user) return;
  user.stats.losses += 1;
  user.stats.gamesPlayed += 1;
  await user.save();
};

const createWithdrawalHold = async (userId, amount, upiId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user || user.wallet.withdrawable < amount) {
      throw new Error('Insufficient withdrawable balance');
    }

    user.wallet.withdrawable -= amount;
    user.wallet.balance -= amount;
    user.stats.totalWithdrawn += amount;
    await user.save({ session });

    const Withdrawal = require('../models/Withdrawal');
    const withdrawal = await Withdrawal.create(
      [{ userId, amount, upiId, status: 'pending' }],
      { session },
    );

    await Transaction.create(
      [{
        userId,
        type: 'withdrawal',
        amount,
        status: 'pending',
        meta: { upiId, withdrawalId: withdrawal[0]._id },
      }],
      { session },
    );

    await session.commitTransaction();
    return { user, withdrawal: withdrawal[0] };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const restoreWithdrawable = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) return;
  user.wallet.withdrawable += amount;
  user.wallet.balance += amount;
  if (user.stats) user.stats.totalWithdrawn = Math.max(0, user.stats.totalWithdrawn - amount);
  await user.save();
  return user;
};

const creditBonus = async (userId, amount, reason) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  user.wallet.balance += amount;
  user.wallet.bonus += amount;
  await user.save();

  await Transaction.create({
    userId,
    type: 'bonus',
    amount,
    status: 'completed',
    meta: { reason },
  });

  return user;
};

module.exports = {
  creditDeposit,
  deductEntryFee,
  creditWinnings,
  recordLoss,
  createWithdrawalHold,
  restoreWithdrawable,
  creditBonus,
  getFinancialYear,
};
