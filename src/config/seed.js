/**
 * Seed script — run once:
 *   node src/config/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./database');
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const Admin = require('../models/Admin');

const PRODUCTS = [
  { name: 'Premium Wheat Series', category: 'limited', price: 80000, dailyRate: 3.20, periodDays: 40, maxPurchases: 2, totalSlots: 100, filledSlots: 78, description: 'This investment supports insured wheat farming cooperatives in Eastern Rwanda. Investors receive stable daily returns backed by crop insurance and forward contracts.', afterDescription: 'After purchase, daily income will be credited automatically to your selected wallet.', imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80', sortOrder: 1 },
  { name: 'Maize Harvest Bond',    category: 'limited', price: 120000, dailyRate: 2.90, periodDays: 35, maxPurchases: 2, totalSlots: 100, filledSlots: 45, description: 'Seasonal maize bond tied to certified cooperatives in Southern Rwanda with guaranteed yield targets.', afterDescription: 'Returns are unlocked after the full bond maturity date. Income compounds daily into your profit wallet.', imageUrl: 'https://images.unsplash.com/photo-1601379760883-1bb497c558a4?w=800&q=80', sortOrder: 2 },
  { name: 'Rice Cooperative Fund', category: 'crops',   price: 250000, dailyRate: 2.80, periodDays: 45, maxPurchases: 3, totalSlots: 200, filledSlots: 62, description: 'Fund regional rice farmers supplying East African markets.', afterDescription: 'Returns are calculated daily and deposited automatically.', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80', sortOrder: 3 },
  { name: 'Soybean Export Pool',   category: 'crops',   price: 175000, dailyRate: 3.10, periodDays: 42, maxPurchases: 4, totalSlots: 200, filledSlots: 30, description: 'Pool investment in soybean farming destined for East African export markets.', afterDescription: 'Capital is locked during the period and released with full returns upon maturity.', imageUrl: 'https://images.unsplash.com/photo-1535914254981-b5012eebbd15?w=800&q=80', sortOrder: 4 },
  { name: 'Agri Robotics Unit R-3',category: 'robotics',price: 500000, dailyRate: 4.10, periodDays: 30, maxPurchases: 1, totalSlots: 50,  filledSlots: 45, description: 'Invest in automated irrigation and crop-monitoring robots deployed in commercial farms.', afterDescription: 'Robotics investments generate higher daily yield due to operational efficiency gains.', imageUrl: 'https://images.unsplash.com/photo-1581093588401-22b9a3f1f2f3?w=800&q=80', sortOrder: 5 },
  { name: 'Smart Greenhouse AI',   category: 'robotics',price: 380000, dailyRate: 3.70, periodDays: 28, maxPurchases: 2, totalSlots: 50,  filledSlots: 27, description: 'AI-powered greenhouse management units reducing labor costs and increasing yields.', afterDescription: 'Returns are tied directly to farm output metrics tracked in real time.', imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&q=80', sortOrder: 6 },
  { name: 'Organic Fertilizer Plant', category: 'fertilizer', price: 150000, dailyRate: 2.50, periodDays: 50, maxPurchases: 5, totalSlots: 300, filledSlots: 60, description: 'Support local fertilizer production plants supplying farmers nationwide.', afterDescription: 'Earnings come from distribution profits across contracted agricultural cooperatives.', imageUrl: 'https://images.unsplash.com/photo-1615486368434-5b8b66b74fd9?w=800&q=80', sortOrder: 7 },
  { name: 'BioNutrient Series B',  category: 'fertilizer', price: 200000, dailyRate: 2.70, periodDays: 45, maxPurchases: 3, totalSlots: 300, filledSlots: 204, description: 'Series B funding round for bio-nutrient production facilities across Rwanda and Uganda.', afterDescription: 'Income is distributed weekly from plant revenue shares, credited to your selected wallet.', imageUrl: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=800&q=80', sortOrder: 8 },
];

const SETTINGS = [
  { key: 'deposit_phone',           value: '+250788000000' },
  { key: 'deposit_phone_name',      value: 'OCP Investment Ltd' },
  { key: 'min_recharge',            value: '5000' },
  { key: 'min_withdrawal',          value: '10000' },
  { key: 'max_withdrawal_per_day',  value: '5000000' },
  { key: 'commission_level_a',      value: '8' },
  { key: 'commission_level_b',      value: '4' },
  { key: 'commission_level_c',      value: '2' },
  { key: 'commission_level_d',      value: '1' },
  { key: 'platform_name',           value: 'OCP Investment' },
];

(async () => {
  await connectDB();
  console.log('Seeding database...');

  await Product.deleteMany({});
  await Product.insertMany(PRODUCTS);
  console.log(`✓ ${PRODUCTS.length} products seeded`);

  for (const s of SETTINGS) {
    await Setting.findOneAndUpdate({ key: s.key }, { value: s.value }, { upsert: true });
  }
  console.log(`✓ ${SETTINGS.length} settings seeded`);

  const existing = await Admin.findOne({ email: 'admin@ocp.rw' });
  if (!existing) {
    await Admin.create({
      name: 'Super Admin',
      email: 'admin@ocp.rw',
      passwordHash: await bcrypt.hash('Admin@12345', 12),
      role: 'super_admin',
    });
    console.log('✓ Default admin created: admin@ocp.rw / Admin@12345');
  }

  console.log('Seeding complete!');
  await mongoose.disconnect();
})();
