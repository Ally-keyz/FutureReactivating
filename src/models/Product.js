const mongoose = require('mongoose');

const PRODUCT_CATEGORIES = [
  // Agricultural
  'crops',
  'livestock',
  'fertilizer',
  'agri_equipment',
  'aquaculture',
  'forestry',
  // Technology
  'robotics',
  'solar_energy',
  'tech_infrastructure',
  // Real Estate & Construction
  'real_estate',
  'construction',
  // Trade & Commerce
  'import_export',
  'retail',
  'logistics',
  // Finance & Limited Offers
  'limited',
  'micro_finance',
  // Health & Pharma
  'healthcare',
  'pharmaceuticals',
  // Food & Beverage
  'food_processing',
  'beverages',
  // Education & Services
  'education',
  'tourism',
];

const productSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  category:        { type: String, enum: PRODUCT_CATEGORIES, required: true },
  price:           { type: Number, required: true },
  dailyRate:       { type: Number, required: true },   // percentage e.g. 3.20
  periodDays:      { type: Number, required: true },
  maxPurchases:    { type: Number, default: 1 },
  totalSlots:      { type: Number, default: 1000 },
  filledSlots:     { type: Number, default: 0 },
  description:     { type: String, required: true },
  afterDescription:{ type: String, required: true },
  imageUrl:        { type: String, required: true },
  isActive:        { type: Boolean, default: true },
  sortOrder:       { type: Number, default: 0 },
}, { timestamps: true });

productSchema.virtual('investedPercent').get(function () {
  return Math.round((this.filledSlots / this.totalSlots) * 100);
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;