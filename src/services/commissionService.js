const mongoose = require('mongoose');
const { User, Wallet } = require('../models/User');
const Commission = require('../models/Commission');
const walletService = require('./walletService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

const COMMISSION_RATES = { 1: 8, 2: 4, 3: 2, 4: 1 };

/**
 * Walk up the referral chain (up to 4 levels) and pay commissions.
 * All DB writes happen inside the caller's session.
 */
const payOnInvestment = async (investorId, investmentId, investedAmount, session) => {
  let currentUserId = investorId;

  for (let level = 1; level <= 4; level++) {
    const currentUser = await User.findById(currentUserId).select('referredBy').lean();
    if (!currentUser || !currentUser.referredBy) break;

    const earnerId = currentUser.referredBy;
    const rate = COMMISSION_RATES[level];
    const amount = parseFloat((investedAmount * rate / 100).toFixed(2));

    const wallet = await Wallet.findOne({ userId: earnerId, type: 'balance' });
    if (!wallet) { currentUserId = earnerId; continue; }

    await walletService.credit(
      wallet._id, earnerId, amount,
      'team_commission', investmentId,
      `Level ${level} commission from investment`, session
    );

    await Commission.create([{
      earnerId,
      sourceUserId: investorId,
      investmentId,
      level,
      rate,
      amount,
    }], { session });

    // Fire-and-forget notification (outside session is fine)
    notificationService.send(earnerId, 'reward', 'Team Commission Earned',
      `${amount.toLocaleString()} RWF Level ${level} commission credited to your balance wallet.`
    ).catch(() => {});

    currentUserId = earnerId;
  }
};

module.exports = { payOnInvestment };
