const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { User } = require('../models/User');
const walletService = require('../services/walletService');
const notificationService = require('../services/notificationService');
const { success, error } = require('../utils/response');
const mongoose = require('mongoose');

const generateTokens = (userId) => ({
  token: jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }),
  refreshToken: jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }),
});

// ── Validation rules ──────────────────────────────────────────
exports.registerRules = [
  body('fullName').trim().isLength({ min: 3 }).withMessage('Full name must be at least 3 characters'),
  body('phone').trim().matches(/^\+?[0-9]{10,15}$/).withMessage('Valid phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

exports.loginRules = [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Handlers ──────────────────────────────────────────────────
exports.register = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { fullName, phone, password, referralCode: refCode } = req.body;

    const exists = await User.findOne({ phone: phone.trim() }).session(session);
    if (exists) {
      await session.abortTransaction();
      return error(res, 'Phone number already registered', 409);
    }

    let referredBy = null;
    if (refCode) {
      const referrer = await User.findOne({ referralCode: refCode.toUpperCase() }).session(session).lean();
      if (referrer) referredBy = referrer._id;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // ✅ ordered: true is required when using create() with a session + array
    const [user] = await User.create(
      [{ fullName, phone, passwordHash, referredBy }],
      { session, ordered: true }
    );

    await walletService.createWalletsForUser(user._id, session);

    await session.commitTransaction();

    // Welcome notification (outside tx is fine)
    notificationService.send(user._id, 'info', 'Welcome to OCP!',
      'Your account has been created. Recharge your wallet to start investing.').catch(() => {});

    return success(res, { uid: user.uid }, 'Account created successfully', 201);
  } catch (err) {
    await session.abortTransaction();
    return error(res, err.message, 500);
  } finally {
    session.endSession();
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone: phone.trim() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return error(res, 'Invalid phone or password', 401);
    }
    user.lastLoginAt = new Date();
    await user.save();

    const { token, refreshToken } = generateTokens(user._id);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    delete safeUser.withdrawPinHash;

    return success(res, { token, refreshToken, user: safeUser });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.logout = (req, res) => success(res, null, 'Logged out successfully');

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token required', 400);
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return error(res, 'User not found', 401);
    const { token } = generateTokens(user._id);
    return success(res, { token });
  } catch {
    return error(res, 'Invalid refresh token', 401);
  }
};