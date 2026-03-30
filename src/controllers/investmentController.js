const { body } = require('express-validator');
const mongoose = require('mongoose');
const Investment = require('../models/Investment');
const Product = require('../models/Product');
const { Wallet } = require('../models/User');
const walletService = require('../services/walletService');
const commissionService = require('../services/commissionService');
const notificationService = require('../services/notificationService');
const { success, error } = require('../utils/response');
const { todayString, addDays, daysBetween } = require('../utils/dateHelper');

const enrichInvestment = (inv) => {
  const today = todayString();
  const daysLeft = daysBetween(new Date(), inv.endsAt);
  return {
    ...inv,
    todayEarned: inv.lastEarnedDate === today,
    daysLeft,
  };
};

exports.storeRules = [
  body('productId').notEmpty().withMessage('Product ID required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('walletType').isIn(['balance', 'recharge', 'profit', 'bonus']).withMessage('Invalid wallet type'),
];

// ── GET /investments ───────────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const investments = await Investment.find(filter)
      .populate('productId', 'name category dailyRate periodDays imageUrl description')
      .sort({ createdAt: -1 })
      .lean();

    return success(res, investments.map(inv => ({
      ...inv,
      product: inv.productId,
      todayEarned: inv.lastEarnedDate === todayString(),
      daysLeft: daysBetween(new Date(), inv.endsAt),
    })));
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── GET /investments/:id ───────────────────────────────────────
exports.show = async (req, res) => {
  try {
    const inv = await Investment.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('productId')
      .populate('walletId', 'type balance')
      .lean();
    if (!inv) return error(res, 'Investment not found', 404);
    return success(res, {
      ...inv,
      todayEarned: inv.lastEarnedDate === todayString(),
      daysLeft: daysBetween(new Date(), inv.endsAt),
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── POST /investments ──────────────────────────────────────────
exports.store = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { productId, quantity: rawQty, walletType } = req.body;
    const quantity = parseInt(rawQty);

    const product = await Product.findOne({ _id: productId, isActive: true }).session(session);
    if (!product) { await session.abortTransaction(); return error(res, 'Product not found or inactive', 404); }

    if (quantity > product.maxPurchases) {
      await session.abortTransaction();
      return error(res, `Max ${product.maxPurchases} purchases allowed per user`, 400);
    }

    // Check existing user purchases of this product
    const [existing] = await Investment.aggregate([
      { $match: { userId: req.user._id, productId: product._id, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]).session(session);
    if ((existing?.total || 0) + quantity > product.maxPurchases) {
      await session.abortTransaction();
      return error(res, `You can only purchase this product ${product.maxPurchases} time(s) total.`, 400);
    }

    // Check slots
    const available = product.totalSlots - product.filledSlots;
    if (quantity > available) { await session.abortTransaction(); return error(res, `Only ${available} slots available`, 400); }

    // Check wallet
    const wallet = await Wallet.findOne({ userId: req.user._id, type: walletType }).session(session);
    if (!wallet) { await session.abortTransaction(); return error(res, 'Wallet not found', 404); }

    const totalCost = product.price * quantity;
    if (wallet.balance < totalCost) { await session.abortTransaction(); return error(res, 'Insufficient wallet balance', 400); }

    const dailyIncome = parseFloat((product.price * product.dailyRate / 100 * quantity).toFixed(2));
    const totalExpected = parseFloat((dailyIncome * product.periodDays).toFixed(2));
    const startsAt = new Date();
    const endsAt = addDays(startsAt, product.periodDays);

    // Deduct from wallet
    await walletService.debit(wallet._id, req.user._id, totalCost, 'investment', null,
      `Invested in ${product.name} ×${quantity}`, session);

    // Create investment
    const [investment] = await Investment.create([{
      userId: req.user._id,
      productId: product._id,
      walletId: wallet._id,
      walletType,
      quantity,
      totalCost,
      dailyIncome,
      totalExpected,
      startsAt,
      endsAt,
    }], { session });

    // Increment filled slots
    await Product.findByIdAndUpdate(product._id, { $inc: { filledSlots: quantity } }, { session });

    // Pay commissions
    await commissionService.payOnInvestment(req.user._id, investment._id, totalCost, session);

    await session.commitTransaction();

    notificationService.send(req.user._id, 'success', 'Investment Confirmed',
      `Your purchase of ${product.name} (×${quantity}) was successful. Daily income of ${dailyIncome.toLocaleString()} RWF starts today.`
    ).catch(() => {});

    return success(res, {
      investmentId: investment._id,
      dailyIncome,
      endsAt,
    }, 'Investment successful', 201);
  } catch (err) {
    await session.abortTransaction();
    return error(res, err.message, 500);
  } finally {
    session.endSession();
  }
};

// ── POST /investments/:id/claim ────────────────────────────────
exports.claimDaily = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const today = todayString();

    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'pending',
    }).session(session);

    if (!investment) { await session.abortTransaction(); return error(res, 'Active investment not found', 404); }
    if (investment.lastEarnedDate === today) { await session.abortTransaction(); return error(res, 'Daily income already claimed today', 400); }
    if (new Date() > investment.endsAt) { await session.abortTransaction(); return error(res, 'Investment period has ended', 400); }

    const amount = investment.dailyIncome;
    const newCompleted = investment.daysCompleted + 1;
    const newEarned = parseFloat((investment.totalEarned + amount).toFixed(2));
    const isComplete = newCompleted >= investment.periodDays;

    // Credit wallet
    await walletService.credit(investment.walletId, req.user._id, amount, 'daily_income',
      investment._id, `Daily income — day ${newCompleted}`, session);

    // Update investment
    await Investment.findByIdAndUpdate(investment._id, {
      daysCompleted: newCompleted,
      totalEarned: newEarned,
      lastEarnedDate: today,
      status: isComplete ? 'completed' : 'pending',
      completedAt: isComplete ? new Date() : null,
    }, { session });

    await session.commitTransaction();

    // Notifications
    if (isComplete) {
      notificationService.send(req.user._id, 'success', 'Investment Completed!',
        `Investment has matured. Total earned: ${newEarned.toLocaleString()} RWF released to your wallet.`).catch(() => {});
    } else {
      notificationService.send(req.user._id, 'reward', 'Daily Income Credited',
        `${amount.toLocaleString()} RWF has been added to your wallet. Day ${newCompleted}/${investment.periodDays}.`).catch(() => {});
    }

    return success(res, { amountEarned: amount, daysCompleted: newCompleted, status: isComplete ? 'completed' : 'pending' });
  } catch (err) {
    await session.abortTransaction();
    return error(res, err.message, 500);
  } finally {
    session.endSession();
  }
};
