const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  earnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment', required: true },
  level: { type: Number, required: true },    // 1=A, 2=B, 3=C, 4=D
  rate: { type: Number, required: true },     // percentage
  amount: { type: Number, required: true },
}, { timestamps: true });

commissionSchema.index({ earnerId: 1 });

module.exports = mongoose.model('Commission', commissionSchema);
