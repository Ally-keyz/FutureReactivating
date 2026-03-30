const mongoose = require('mongoose');

const rechargeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  senderPhone: { type: String, required: true },
  senderName: { type: String, required: true },
  depositPhone: { type: String, required: true },
  referenceCode: { type: String, unique: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

rechargeSchema.pre('save', function (next) {
  if (!this.referenceCode) {
    this.referenceCode = 'RCH-' + Math.random().toString(36).substring(2, 12).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('RechargeRequest', rechargeSchema);
