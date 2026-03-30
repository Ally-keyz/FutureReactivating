const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { User } = require('../models/User');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const walletService = require('../services/walletService');
const { success, error } = require('../utils/response');

exports.profile = async (req, res) => {
  try {
    const wallets = await walletService.getUserWallets(req.user._id);
    const totalAssets = wallets.reduce((s, w) => s + w.balance, 0);

    const [stats] = await Transaction.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
        _id: null,
        totalIncome: { $sum: { $cond: [{ $in: ['$type', ['daily_income', 'team_commission']] }, '$amount', 0] } },
        totalRecharge: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'recharge'] }, { $eq: ['$direction', 'credit'] }] }, '$amount', 0] } },
        totalWithdraw: { $sum: { $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0] } },
        teamIncome: { $sum: { $cond: [{ $eq: ['$type', 'team_commission'] }, '$amount', 0] } },
      }}
    ]);

    // Today income via match on date
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const [todayStats] = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'daily_income', createdAt: { $gte: todayStart } } },
      { $group: { _id: null, todayIncome: { $sum: '$amount' } } }
    ]);

    return success(res, {
      user: req.user,
      wallets,
      stats: {
        totalAssets,
        totalIncome: stats?.totalIncome || 0,
        totalRecharge: stats?.totalRecharge || 0,
        totalWithdraw: stats?.totalWithdraw || 0,
        teamIncome: stats?.teamIncome || 0,
        todayIncome: todayStats?.todayIncome || 0,
      }
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.stats = async (req, res) => {
  try {
    const [result] = await Investment.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
        _id: null,
        active: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalInvested: { $sum: '$totalCost' },
        totalEarned: { $sum: '$totalEarned' },
      }}
    ]);
    return success(res, result || { active: 0, completed: 0, totalInvested: 0, totalEarned: 0 });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

exports.changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
      return error(res, 'Current password is incorrect', 400);
    }
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    return success(res, null, 'Password updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.setWithdrawPinRules = [
  body('pin').isLength({ min: 6, max: 6 }).isNumeric().withMessage('PIN must be a 6-digit number'),
];

exports.setWithdrawPin = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.withdrawPinHash = await bcrypt.hash(req.body.pin, 12);
    await user.save();
    return success(res, null, 'Withdrawal PIN set successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
