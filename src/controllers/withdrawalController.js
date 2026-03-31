const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const mongoose = require('mongoose');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const { User, Wallet } = require('../models/User');
const walletService = require('../services/walletService');
const notificationService = require('../services/notificationService');
const settingService = require('../services/settingService');
const { success, error } = require('../utils/response');

exports.storeRules = [
  body('amount').isNumeric().withMessage('Amount must be numeric')
    .custom(async (val) => {
      const min = parseInt(await settingService.get('min_withdrawal', '10000'));
      if (parseFloat(val) < min) throw new Error(`Minimum withdrawal is ${min.toLocaleString()} RWF`);
      return true;
    }),
  body('phone').trim().matches(/^\+?[0-9]{10,15}$/).withMessage('Valid phone number required'),
  body('walletType').isIn(['balance', 'profit', 'bonus']).withMessage('Invalid wallet type'),
  body('pin').isLength({ min: 6, max: 6 }).withMessage('PIN must be 6 digits'),
];

exports.store = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, phone, walletType, pin } = req.body;
    const parsedAmount = parseFloat(amount);

    // Verify withdrawal PIN
    const user = await User.findById(req.user._id).select('withdrawPinHash');
    if (!user.withdrawPinHash) {
      await session.abortTransaction();
      return error(res, 'Please set a withdrawal PIN in your profile before withdrawing.', 403);
    }
    if (!(await bcrypt.compare(pin, user.withdrawPinHash))) {
      await session.abortTransaction();
      return error(res, 'Incorrect withdrawal PIN.', 403);
    }

    // Check daily withdrawal limit
    const maxDaily = parseFloat(await settingService.get('max_withdrawal_per_day', '5000000'));
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [todayTotal] = await WithdrawalRequest.aggregate([
      { $match: { userId: req.user._id, status: { $ne: 'rejected' }, createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    if ((todayTotal?.total || 0) + parsedAmount > maxDaily) {
      await session.abortTransaction();
      return error(res, `Daily withdrawal limit of ${maxDaily.toLocaleString()} RWF exceeded.`, 400);
    }

    // Locate the chosen wallet and verify balance
    const wallet = await Wallet.findOne({ userId: req.user._id, type: walletType });
    if (!wallet) { await session.abortTransaction(); return error(res, 'Wallet not found', 404); }
    if (wallet.balance < parsedAmount) { await session.abortTransaction(); return error(res, 'Insufficient balance', 400); }

    // Debit immediately to hold funds while request is pending
    await walletService.debit(wallet._id, req.user._id, parsedAmount, 'withdrawal', null,
      'Withdrawal hold - pending admin approval', session);

    const withdrawal = await WithdrawalRequest.create([{
      userId: req.user._id,
      walletId: wallet._id,
      walletType,
      amount: parsedAmount,
      phone: phone.trim(),
    }], { session });

    await session.commitTransaction();

    notificationService.send(req.user._id, 'info', 'Withdrawal Request Submitted',
      `Your withdrawal of ${parsedAmount.toLocaleString()} RWF to ${phone} is being processed. You will receive the funds within 24 hours.`
    ).catch(() => {});

    return success(res, {
      id: withdrawal[0]._id,
      amount: parsedAmount,
      phone,
      status: 'pending',
      message: 'Withdrawal submitted. Funds will be sent to your phone within 24 hours.',
    }, 'Withdrawal submitted', 201);
  } catch (err) {
    await session.abortTransaction();
    return error(res, err.message, 500);
  } finally {
    session.endSession();
  }
};

exports.index = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    const withdrawals = await WithdrawalRequest.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    return success(res, withdrawals);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.show = async (req, res) => {
  try {
    const withdrawal = await WithdrawalRequest.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!withdrawal) return error(res, 'Not found', 404);
    return success(res, withdrawal);
  } catch (err) {
    return error(res, err.message, 500);
  }
};