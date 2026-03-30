const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['limited', 'crops', 'robotics', 'fertilizer'], required: true },
  price: { type: Number, required: true },
  dailyRate: { type: Number, required: true },        // percentage e.g. 3.20
  periodDays: { type: Number, required: true },
  maxPurchases: { type: Number, default: 1 },
  totalSlots: { type: Number, default: 1000 },
  filledSlots: { type: Number, default: 0 },
  description: { type: String, required: true },
  afterDescription: { type: String, required: true },
  imageUrl: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

productSchema.virtual('investedPercent').get(function () {
  return Math.round((this.filledSlots / this.totalSlots) * 100);
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
