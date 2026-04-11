const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const { User, Wallet } = require('../models/User');
const RechargeRequest = require('../models/RechargeRequest');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Investment = require('../models/Investment');
const Product = require('../models/Product');
const Commission = require('../models/Commission');
const Setting = require('../models/Setting');
const walletService = require('../services/walletService');
const notificationService = require('../services/notificationService');
const settingService = require('../services/settingService');
const { success, error } = require('../utils/response');
// ── Safe transaction helper ───────────────────────────────────
// Wraps session lifecycle so every caller gets correct
// abort-in-catch + endSession-in-finally behaviour.
const withTransaction = async (fn) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    try { await session.abortTransaction(); } catch (_) { /* ignore abort errors */ }
    throw err; // re-throw so the controller catch block handles the response
  } finally {
    session.endSession(); // always runs — never leaks the session
  }
};

// ── Auth ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email?.toLowerCase().trim() });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return error(res, 'Invalid credentials', 401);
    }
    const token = jwt.sign(
      { sub: admin._id, role: admin.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h' }
    );
    return success(res, { token, admin: { id: admin._id, name: admin.name, role: admin.role } });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Dashboard ─────────────────────────────────────────────────
exports.dashboard = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers, validUsers, activeInvestments,
      pendingRecharges, pendingWithdrawals,
      totalInvestedAgg, todayIncomeAgg, totalCommissionsAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isValid: true }),
      Investment.countDocuments({ status: 'pending' }),
      RechargeRequest.countDocuments({ status: 'pending' }),
      WithdrawalRequest.countDocuments({ status: 'pending' }),
      Investment.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalCost' } } },
      ]),
      Investment.aggregate([
        { $match: { lastEarnedDate: new Date().toISOString().split('T')[0] } },
        { $group: { _id: null, total: { $sum: '$dailyIncome' } } },
      ]),
      Commission.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return success(res, {
      totalUsers,
      validUsers,
      activeInvestments,
      pendingRecharges,
      pendingWithdrawals,
      totalInvested:    totalInvestedAgg[0]?.total    || 0,
      todayIncomePaid:  todayIncomeAgg[0]?.total      || 0,
      totalCommissions: totalCommissionsAgg[0]?.total || 0,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Users ─────────────────────────────────────────────────────
exports.users = async (req, res) => {
  try {
    const { search, page = 1 } = req.query;
    const limit = 50;
    const filter = {};
    if (search) filter.$or = [
      { fullName: new RegExp(search, 'i') },
      { phone:    new RegExp(search, 'i') },
      { uid:      new RegExp(search, 'i') },
    ];
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -withdrawPinHash')
        .skip((parseInt(page) - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(filter),
    ]);
    return success(res, { users, total, page: parseInt(page) });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.userDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -withdrawPinHash').lean();
    if (!user) return error(res, 'User not found', 404);
    const [wallets, investments] = await Promise.all([
      Wallet.find({ userId: user._id }).lean(),
      Investment.find({ userId: user._id }).populate('productId', 'name').lean(),
    ]);
    return success(res, { user, wallets, investments });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Recharges ─────────────────────────────────────────────────
exports.recharges = async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    const limit = 50;
    const filter = {};
    if (status) filter.status = status;
    const [recharges, total] = await Promise.all([
      RechargeRequest.find(filter)
        .populate('userId', 'fullName phone uid')
        .skip((parseInt(page) - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      RechargeRequest.countDocuments(filter),
    ]);
    return success(res, { recharges, total, page: parseInt(page) });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.approveRecharge = async (req, res) => {
  try {
    const request = await RechargeRequest.findOne({
      _id: req.params.id, status: 'pending',
    });
    if (!request) return error(res, 'Request not found or already processed', 404);

    const balanceWallet = await Wallet.findOne({ userId: request.userId, type: 'balance' });
    if (!balanceWallet) return error(res, 'Balance wallet not found for user', 400);

    await withTransaction(async (session) => {
      await walletService.credit(
        balanceWallet._id, request.userId, request.amount,
        'recharge', request._id,
        `Recharge approved ref:${request.referenceCode}`,
        session
      );
      await User.findByIdAndUpdate(
        request.userId, { isValid: true }, { session }
      );
      await RechargeRequest.findByIdAndUpdate(request._id, {
        status:     'approved',
        reviewedBy: req.admin._id,
        reviewedAt: new Date(),
      }, { session });
    });

    notificationService.send(
      request.userId, 'success', 'Recharge Approved',
      `${request.amount.toLocaleString()} RWF has been credited to your wallet. Ref: ${request.referenceCode}`
    ).catch(() => {});

    try {
      const { getIO } = require('../config/socket');
      const io = getIO?.();
      if (io) io.to(`user:${request.userId}`).emit('wallet:update', {
        type: 'recharge', amount: request.amount,
      });
    } catch (_) {}

    return success(res, null, 'Recharge approved');
  } catch (err) {
    console.error('[approveRecharge]', err);
    return error(res, err.message, 500);
  }
};

exports.rejectRecharge = async (req, res) => {
  try {
    const request = await RechargeRequest.findOne({ _id: req.params.id, status: 'pending' });
    if (!request) return error(res, 'Not found or already processed', 404);
    await RechargeRequest.findByIdAndUpdate(request._id, {
      status:     'rejected',
      adminNote:  req.body.note || '',
      reviewedBy: req.admin._id,
      reviewedAt: new Date(),
    });
    notificationService.send(
      request.userId, 'warning', 'Recharge Rejected',
      `Your recharge ref ${request.referenceCode} was rejected. Reason: ${req.body.note || 'Contact support.'}`
    ).catch(() => {});
    return success(res, null, 'Recharge rejected');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Withdrawals ───────────────────────────────────────────────
exports.withdrawals = async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    const limit = 50;
    const filter = {};
    if (status) filter.status = status;
    const [withdrawals, total] = await Promise.all([
      WithdrawalRequest.find(filter)
        .populate('userId', 'fullName phone uid')
        .skip((parseInt(page) - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      WithdrawalRequest.countDocuments(filter),
    ]);
    return success(res, { withdrawals, total, page: parseInt(page) });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.approveWithdrawal = async (req, res) => {
  try {
    const request = await WithdrawalRequest.findOne({ _id: req.params.id, status: 'pending' });
    if (!request) return error(res, 'Not found or already processed', 404);
    await WithdrawalRequest.findByIdAndUpdate(request._id, {
      status:     'approved',
      reviewedBy: req.admin._id,
      reviewedAt: new Date(),
    });
    notificationService.send(
      request.userId, 'success', 'Withdrawal Approved',
      `${request.amount.toLocaleString()} RWF has been sent to ${request.phone}.`
    ).catch(() => {});
    return success(res, null, 'Withdrawal approved');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    // ── Pre-flight: load before transaction ───────────────────
    const request = await WithdrawalRequest.findOne({ _id: req.params.id, status: 'pending' });
    if (!request) return error(res, 'Not found or already processed', 404);
    if (!request.walletId) return error(res, 'Wallet reference missing on withdrawal', 400);

    // ── Transaction: refund + status update ───────────────────
    await withTransaction(async (session) => {
      await walletService.credit(
        request.walletId, request.userId, request.amount,
        'refund', request._id,
        `Withdrawal rejected — refunded. Reason: ${req.body.note || 'N/A'}`,
        session
      );
      await WithdrawalRequest.findByIdAndUpdate(request._id, {
        status:     'rejected',
        adminNote:  req.body.note || '',
        reviewedBy: req.admin._id,
        reviewedAt: new Date(),
      }, { session });
    });

    notificationService.send(
      request.userId, 'warning', 'Withdrawal Rejected',
      `Your withdrawal of ${request.amount.toLocaleString()} RWF was rejected and refunded. Reason: ${req.body.note || 'Contact support.'}`
    ).catch(() => {});

    return success(res, null, 'Withdrawal rejected and amount refunded');
  } catch (err) {
    console.error('[rejectWithdrawal]', err);
    return error(res, err.message, 500);
  }
};

// ── Products ──────────────────────────────────────────────────
exports.getProducts = async (req, res) => {
  try {
    return success(res, await Product.find().sort({ sortOrder: 1 }).lean());
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    return success(res, product, 'Product created', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return error(res, 'Product not found', 404);
    return success(res, product, 'Product updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    return success(res, null, 'Product deactivated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Settings ──────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    return success(res, await settingService.getAll());
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updateSettings = async (req, res) => {
  try {
    await settingService.setMany(req.body);
    return success(res, null, 'Settings updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};


 
// ── Toggle user valid / invalid ───────────────────────────────
exports.setUserValid = async (req, res) => {
  try {
    const { isValid } = req.body;
    if (typeof isValid !== 'boolean') return error(res, 'isValid (boolean) required', 400);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isValid },
      { new: true, select: '-passwordHash -withdrawPinHash' }
    );
    if (!user) return error(res, 'User not found', 404);
    notificationService.send(
      user._id,
      isValid ? 'success' : 'warning',
      isValid ? 'Account Activated' : 'Account Suspended',
      isValid
        ? 'Your account has been activated by admin.'
        : 'Your account has been suspended. Contact support.'
    ).catch(() => {});
    return success(res, user, `User ${isValid ? 'activated' : 'suspended'}`);
  } catch (err) {
    return error(res, err.message, 500);
  }
};
 
// ── Adjust a wallet balance (credit or debit) ─────────────────
exports.adjustWallet = async (req, res) => {
  try {
    const { walletType, amount, direction, note } = req.body;
    // direction: 'credit' | 'debit'
    if (!['balance', 'profit', 'bonus'].includes(walletType))
      return error(res, 'Invalid walletType', 400);
    if (!['credit', 'debit'].includes(direction))
      return error(res, 'direction must be credit or debit', 400);
    if (!amount || amount <= 0)
      return error(res, 'amount must be > 0', 400);
 
    const wallet = await Wallet.findOne({ userId: req.params.id, type: walletType });
    if (!wallet) return error(res, 'Wallet not found', 404);
 
    await withTransaction(async (session) => {
      if (direction === 'credit') {
        await walletService.credit(
          wallet._id, req.params.id, amount,
          'admin_adjustment', null,
          note || `Admin credit to ${walletType} wallet`,
          session
        );
      } else {
        if (wallet.balance < amount)
          throw new Error('Insufficient wallet balance for debit');
        await walletService.debit(
          wallet._id, req.params.id, amount,
          'admin_adjustment', null,
          note || `Admin debit from ${walletType} wallet`,
          session
        );
      }
    });
 
    const updated = await Wallet.findOne({ userId: req.params.id, type: walletType });
    notificationService.send(
      req.params.id,
      direction === 'credit' ? 'success' : 'warning',
      'Wallet Adjusted',
      `${direction === 'credit' ? '+' : '-'}${amount.toLocaleString()} RWF ${direction === 'credit' ? 'added to' : 'removed from'} your ${walletType} wallet by admin.`
    ).catch(() => {});
    return success(res, { wallet: updated }, 'Wallet adjusted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
 
// ── Reset user password ───────────────────────────────────────
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return error(res, 'newPassword must be at least 6 characters', 400);
    const hash = await bcrypt.hash(newPassword, 12);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { passwordHash: hash },
      { new: true, select: '-passwordHash -withdrawPinHash' }
    );
    if (!user) return error(res, 'User not found', 404);
    return success(res, null, 'Password reset successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
 
// ── Delete user (hard delete — use with caution) ──────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'User not found', 404);
 
    await withTransaction(async (session) => {
      // Cancel active investments
      await Investment.updateMany(
        { userId: user._id, status: 'pending' },
        { status: 'cancelled' },
        { session }
      );
      // Remove wallets
      await Wallet.deleteMany({ userId: user._id }, { session });
      // Remove user
      await User.findByIdAndDelete(user._id, { session });
    });
 
    return success(res, null, 'User deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
 
// ── User transactions (paginated) ─────────────────────────────
exports.userTransactions = async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    const { page = 1, type } = req.query;
    const limit = 30;
    const filter = { userId: req.params.id };
    if (type) filter.type = type;
    const [txns, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);
    return success(res, { transactions: txns, total, page: parseInt(page) });
  } catch (err) {
    return error(res, err.message, 500);
  }
};
 
// ── Cancel a specific investment ──────────────────────────────
exports.cancelInvestment = async (req, res) => {
  try {
    const inv = await Investment.findById(req.params.id).populate('userId', 'fullName');
    if (!inv) return error(res, 'Investment not found', 404);
    if (inv.status !== 'pending') return error(res, 'Only pending investments can be cancelled', 400);
 
    await Investment.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
 
    notificationService.send(
      inv.userId._id,
      'warning',
      'Investment Cancelled',
      `An investment has been cancelled by admin.`
    ).catch(() => {});
 
    return success(res, null, 'Investment cancelled');
  } catch (err) {
    return error(res, err.message, 500);
  }
};