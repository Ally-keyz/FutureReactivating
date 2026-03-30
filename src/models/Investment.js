const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  walletType: { type: String, enum: ['balance', 'recharge', 'profit', 'bonus'] },
  quantity: { type: Number, default: 1 },
  totalCost: { type: Number, required: true },
  dailyIncome: { type: Number, required: true },
  totalExpected: { type: Number, required: true },
  totalEarned: { type: Number, default: 0 },
  daysCompleted: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  lastEarnedDate: { type: String, default: null },    // 'YYYY-MM-DD' string
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

investmentSchema.index({ userId: 1, status: 1 });
investmentSchema.index({ endsAt: 1 });

module.exports = mongoose.model('Investment', investmentSchema);
