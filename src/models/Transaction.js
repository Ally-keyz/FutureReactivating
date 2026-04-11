const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  type: {
    type: String,
    enum: ['recharge', 'withdrawal', 'investment', 'daily_income', 'team_commission', 'refund', 'transfer' , 'admin_adjustment'],
    required: true,
  },
  direction: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null }, // generic ref
  note: { type: String, default: '' },
}, { timestamps: true });

transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
