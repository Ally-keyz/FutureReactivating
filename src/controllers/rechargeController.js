const { body } = require('express-validator');
const mongoose = require('mongoose');
const RechargeRequest = require('../models/RechargeRequest');
const { Wallet } = require('../models/User');
const { User } = require('../models/User');
const walletService = require('../services/walletService');
const notificationService = require('../services/notificationService');
const settingService = require('../services/settingService');
const { success, error } = require('../utils/response');

exports.depositInfo = async (req, res) => {
  try {
    const settings = await settingService.getAll();
    return success(res, {
      depositPhone: settings.deposit_phone || process.env.DEPOSIT_PHONE,
      depositPhoneName: settings.deposit_phone_name || process.env.DEPOSIT_PHONE_NAME,
      minRecharge: parseInt(settings.min_recharge || process.env.MIN_RECHARGE || '5000'),
      confirmHours: 24,
      instructions: 'Send money to the number above, then submit this form with your sender phone, sender name, and the exact amount sent. Your balance wallet will be credited within 24 hours after admin confirmation.',
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.storeRules = [
  body('amount').isNumeric().withMessage('Amount must be a number')
    .custom(async (val) => {
      const min = parseInt(await settingService.get('min_recharge', '5000'));
      if (parseFloat(val) < min) throw new Error(`Minimum deposit is ${min.toLocaleString()} RWF`);
      return true;
    }),
  body('senderPhone').trim().matches(/^\+?[0-9]{10,15}$/).withMessage('Valid sender phone required'),
  body('senderName').trim().isLength({ min: 3 }).withMessage('Sender name must be at least 3 characters'),
];

exports.store = async (req, res) => {
  try {
    const { amount, senderPhone, senderName } = req.body;
    const depositPhone = await settingService.get('deposit_phone', process.env.DEPOSIT_PHONE);

    const request = await RechargeRequest.create({
      userId: req.user._id,
      amount: parseFloat(amount),
      senderPhone: senderPhone.trim(),
      senderName: senderName.trim(),
      depositPhone,
    });

    notificationService.send(req.user._id, 'info', 'Deposit Request Submitted',
      `Your deposit of ${parseFloat(amount).toLocaleString()} RWF (Ref: ${request.referenceCode}) is under review. It will be confirmed within 24 hours.`
    ).catch(() => {});

    return success(res, {
      id: request._id,
      referenceCode: request.referenceCode,
      amount: request.amount,
      status: 'pending',
      message: 'Deposit request submitted. Funds will appear in your balance wallet within 24 hours after admin approval.',
    }, 'Deposit request submitted', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * Called by the admin controller when approving a deposit request.
 * Credits the user's BALANCE wallet (deposits always go to balance).
 */
exports.approve = async (userId, requestId, amount, session = null) => {
  const opts = session ? { session } : {};

  const balanceWallet = await Wallet.findOne({ userId, type: 'balance' }, null, opts);
  if (!balanceWallet) throw new Error('Balance wallet not found for user');

  await walletService.credit(
    balanceWallet._id,
    userId,
    amount,
    'deposit',
    requestId,
    'Deposit approved by admin',
    session,
  );

  return balanceWallet;
};

exports.index = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    const requests = await RechargeRequest.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    return success(res, requests);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.show = async (req, res) => {
  try {
    const request = await RechargeRequest.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!request) return error(res, 'Not found', 404);
    return success(res, request);
  } catch (err) {
    return error(res, err.message, 500);
  }
};