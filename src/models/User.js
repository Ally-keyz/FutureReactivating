const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, unique: true },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  withdrawPinHash: { type: String, default: null },
  memberLevel: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  isValid: { type: Boolean, default: false },
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

// Wallet sub-schema — 3 wallet types:
//   balance  → funded by deposits; used to purchase investments
//   profit   → receives daily investment earnings
//   bonus    → receives referral / promotional bonuses
const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['balance', 'profit', 'bonus'], required: true },
  balance: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

walletSchema.index({ userId: 1, type: 1 }, { unique: true });

userSchema.pre('save', function(next) {
  if (!this.uid) this.uid = String(Math.floor(100000000 + Math.random() * 900000000));
  if (!this.referralCode) this.referralCode = generateReferralCode();
  next();
});

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const User = mongoose.model('User', userSchema);
const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = { User, Wallet };