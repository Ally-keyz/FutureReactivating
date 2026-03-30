const { Wallet } = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Credit a wallet atomically and log the transaction.
 */
const credit = async (walletId, userId, amount, type, referenceId = null, note = '', session = null) => {
  const opts = session ? { session } : {};

  // Atomic increment
  const wallet = await Wallet.findByIdAndUpdate(
    walletId,
    { $inc: { balance: amount } },
    { new: true, ...opts }
  );
  if (!wallet) throw new Error('Wallet not found');

  await Transaction.create([{
    userId,
    walletId,
    type,
    direction: 'credit',
    amount,
    balanceAfter: wallet.balance,
    referenceId,
    note,
  }], opts);

  return wallet;
};

/**
 * Debit a wallet atomically — throws if insufficient balance.
 */
const debit = async (walletId, userId, amount, type, referenceId = null, note = '', session = null) => {
  const opts = session ? { session } : {};

  // Atomic decrement with floor-check
  const wallet = await Wallet.findOneAndUpdate(
    { _id: walletId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true, ...opts }
  );
  if (!wallet) throw new Error('Insufficient balance');

  await Transaction.create([{
    userId,
    walletId,
    type,
    direction: 'debit',
    amount,
    balanceAfter: wallet.balance,
    referenceId,
    note,
  }], opts);

  return wallet;
};

/**
 * Create all 4 wallets for a new user.
 */
const createWalletsForUser = async (userId, session = null) => {
  const opts = session ? { session, ordered: true } : {};
  const types = ['balance', 'recharge', 'profit', 'bonus'];
  return Wallet.create(types.map(type => ({ userId, type, balance: 0 })), opts);
};

/**
 * Get all wallets for a user.
 */
const getUserWallets = async (userId) => {
  return Wallet.find({ userId }).lean();
};

module.exports = { credit, debit, createWalletsForUser, getUserWallets };
