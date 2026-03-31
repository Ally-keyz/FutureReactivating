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
  // ─────────────────────────────────────────────
  // LIMITED (flash / high-demand offers)
  // ─────────────────────────────────────────────
  {
    name: 'Premium Wheat Series',
    category: 'limited',
    price: 80000,
    dailyRate: 3.20,
    periodDays: 40,
    maxPurchases: 2,
    totalSlots: 100,
    filledSlots: 78,
    description: 'This investment supports insured wheat farming cooperatives in Eastern Rwanda. Investors receive stable daily returns backed by crop insurance and forward contracts.',
    afterDescription: 'After purchase, daily income will be credited automatically to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80',
    sortOrder: 1,
  },
  {
    name: 'Maize Harvest Bond',
    category: 'limited',
    price: 120000,
    dailyRate: 2.90,
    periodDays: 35,
    maxPurchases: 2,
    totalSlots: 100,
    filledSlots: 45,
    description: 'Seasonal maize bond tied to certified cooperatives in Southern Rwanda with guaranteed yield targets.',
    afterDescription: 'Returns are unlocked after the full bond maturity date. Income compounds daily into your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1601379760883-1bb497c558a4?w=800&q=80',
    sortOrder: 2,
  },
  {
    name: 'Flash Gold: Solar Farm Unit',
    category: 'limited',
    price: 500000,
    dailyRate: 4.50,
    periodDays: 25,
    maxPurchases: 1,
    totalSlots: 50,
    filledSlots: 47,
    description: 'Exclusive limited-slot solar farm investment with the highest daily return rate. Only 50 units available this season.',
    afterDescription: 'Income is credited daily to your profit wallet. Slot reserved immediately upon purchase.',
    imageUrl: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&q=80',
    sortOrder: 3,
  },
 
  // ─────────────────────────────────────────────
  // CROPS
  // ─────────────────────────────────────────────
  {
    name: 'Rice Cooperative Fund',
    category: 'crops',
    price: 250000,
    dailyRate: 2.80,
    periodDays: 45,
    maxPurchases: 3,
    totalSlots: 200,
    filledSlots: 62,
    description: 'Fund regional rice farmers supplying East African markets. Capital is deployed across paddy cooperatives in Bugesera and Nyagatare districts.',
    afterDescription: 'Returns are calculated daily and deposited automatically to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80',
    sortOrder: 4,
  },
  {
    name: 'Soybean Export Pool',
    category: 'crops',
    price: 175000,
    dailyRate: 3.10,
    periodDays: 42,
    maxPurchases: 4,
    totalSlots: 200,
    filledSlots: 30,
    description: 'Pool investment in soybean farming destined for East African export markets. Output is pre-contracted with certified buyers.',
    afterDescription: 'Capital is locked during the period and released with full returns upon maturity.',
    imageUrl: 'https://images.unsplash.com/photo-1535914254981-b5012eebbd15?w=800&q=80',
    sortOrder: 5,
  },
  {
    name: 'Coffee Cherry Estate',
    category: 'crops',
    price: 300000,
    dailyRate: 3.00,
    periodDays: 60,
    maxPurchases: 3,
    totalSlots: 150,
    filledSlots: 110,
    description: 'Invest in specialty arabica coffee estates in the Huye highlands. Coffee is exported to European and Asian markets under fair-trade certification.',
    afterDescription: 'Daily income reflects export price performance. Returns credited to your profit wallet each day.',
    imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80',
    sortOrder: 6,
  },
  {
    name: 'Banana Plantation Bond',
    category: 'crops',
    price: 100000,
    dailyRate: 2.60,
    periodDays: 30,
    maxPurchases: 5,
    totalSlots: 300,
    filledSlots: 140,
    description: 'Short-term bond supporting banana plantations in the Western Province. Bananas are supplied to urban markets and juice processors.',
    afterDescription: 'Returns flow daily to your profit wallet throughout the 30-day cycle.',
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&q=80',
    sortOrder: 7,
  },
  {
    name: 'Irish Potato Highland Fund',
    category: 'crops',
    price: 90000,
    dailyRate: 2.75,
    periodDays: 35,
    maxPurchases: 5,
    totalSlots: 250,
    filledSlots: 80,
    description: 'Support potato farming at altitude in Musanze and Rubavu. High-altitude climate delivers superior yields with lower disease risk.',
    afterDescription: 'Daily income credited automatically for the 35-day investment cycle.',
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&q=80',
    sortOrder: 8,
  },
  {
    name: 'Avocado Export Series',
    category: 'crops',
    price: 220000,
    dailyRate: 3.05,
    periodDays: 50,
    maxPurchases: 3,
    totalSlots: 200,
    filledSlots: 55,
    description: 'Rwanda avocado exports are booming. This fund finances Hass avocado growers contracted to European supermarket chains.',
    afterDescription: 'Returns are backed by export contracts. Daily income is deposited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&q=80',
    sortOrder: 9,
  },
 
  // ─────────────────────────────────────────────
  // LIVESTOCK
  // ─────────────────────────────────────────────
  {
    name: 'Dairy Cattle Investment',
    category: 'livestock',
    price: 350000,
    dailyRate: 2.90,
    periodDays: 60,
    maxPurchases: 2,
    totalSlots: 100,
    filledSlots: 30,
    description: 'Finance imported Friesian cattle placed with certified dairy farmers. Returns generated from daily milk sales to processing facilities.',
    afterDescription: 'Income from milk sales is distributed daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=80',
    sortOrder: 10,
  },
  {
    name: 'Poultry Broiler Cycle',
    category: 'livestock',
    price: 150000,
    dailyRate: 3.20,
    periodDays: 45,
    maxPurchases: 4,
    totalSlots: 200,
    filledSlots: 120,
    description: 'Short-cycle broiler investment. Chicks placed with contracted farmers, sold to restaurants and supermarkets at guaranteed offtake prices.',
    afterDescription: 'Proceeds from each batch cycle are credited daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=80',
    sortOrder: 11,
  },
  {
    name: 'Pig Farming Cooperative',
    category: 'livestock',
    price: 200000,
    dailyRate: 3.00,
    periodDays: 50,
    maxPurchases: 3,
    totalSlots: 150,
    filledSlots: 45,
    description: 'Invest in modern pig farming cooperatives supplying pork to Kigali growing hospitality sector. Veterinary care and feed are centrally managed.',
    afterDescription: 'Daily income is distributed from sale proceeds and credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&q=80',
    sortOrder: 12,
  },
 
  // ─────────────────────────────────────────────
  // FERTILIZER
  // ─────────────────────────────────────────────
  {
    name: 'Organic Fertilizer Plant',
    category: 'fertilizer',
    price: 150000,
    dailyRate: 2.50,
    periodDays: 50,
    maxPurchases: 5,
    totalSlots: 300,
    filledSlots: 60,
    description: 'Support local fertilizer production plants supplying farmers nationwide. The plant converts organic waste into premium compost.',
    afterDescription: 'Earnings come from distribution profits across contracted agricultural cooperatives.',
    imageUrl: 'https://images.unsplash.com/photo-1615486368434-5b8b66b74fd9?w=800&q=80',
    sortOrder: 13,
  },
  {
    name: 'BioNutrient Series B',
    category: 'fertilizer',
    price: 200000,
    dailyRate: 2.70,
    periodDays: 45,
    maxPurchases: 3,
    totalSlots: 300,
    filledSlots: 204,
    description: 'Series B funding round for bio-nutrient production facilities across Rwanda and Uganda.',
    afterDescription: 'Income is distributed daily from plant revenue shares, credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=800&q=80',
    sortOrder: 14,
  },
 
  // ─────────────────────────────────────────────
  // AGRI EQUIPMENT
  // ─────────────────────────────────────────────
  {
    name: 'Tractor Fleet Leasing',
    category: 'agri_equipment',
    price: 400000,
    dailyRate: 3.40,
    periodDays: 60,
    maxPurchases: 2,
    totalSlots: 80,
    filledSlots: 35,
    description: 'Finance a fleet of modern tractors leased to farming cooperatives at daily rates. Equipment is insured and GPS-tracked.',
    afterDescription: 'Lease income is pooled and distributed daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=800&q=80',
    sortOrder: 15,
  },
  {
    name: 'Irrigation Infrastructure Bond',
    category: 'agri_equipment',
    price: 280000,
    dailyRate: 2.80,
    periodDays: 55,
    maxPurchases: 3,
    totalSlots: 120,
    filledSlots: 50,
    description: 'Bond financing drip-irrigation systems for vegetable farmers in the Eastern Province. Reduces water usage by 60% while doubling yields.',
    afterDescription: 'Returns are generated from water-savings contracts signed with partner farms.',
    imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
    sortOrder: 16,
  },
 
  // ─────────────────────────────────────────────
  // AQUACULTURE
  // ─────────────────────────────────────────────
  {
    name: 'Lake Kivu Tilapia Farm',
    category: 'aquaculture',
    price: 180000,
    dailyRate: 3.00,
    periodDays: 45,
    maxPurchases: 4,
    totalSlots: 200,
    filledSlots: 90,
    description: 'Cage fish farming on Lake Kivu. Tilapia is sold to supermarkets and hotels in Kigali under a fixed-price supply agreement.',
    afterDescription: 'Daily earnings from fish sales are credited directly to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800&q=80',
    sortOrder: 17,
  },
  {
    name: 'Shrimp Hatchery Series A',
    category: 'aquaculture',
    price: 320000,
    dailyRate: 3.50,
    periodDays: 50,
    maxPurchases: 2,
    totalSlots: 100,
    filledSlots: 20,
    description: 'Series A investment in an inland shrimp hatchery targeting export markets. The hatchery uses recirculating aquaculture system (RAS) technology.',
    afterDescription: 'Revenue from shrimp sales is distributed daily to investors\' profit wallets.',
    imageUrl: 'https://images.unsplash.com/photo-1559181567-c3190b42be73?w=800&q=80',
    sortOrder: 18,
  },
 
  // ─────────────────────────────────────────────
  // FORESTRY
  // ─────────────────────────────────────────────
  {
    name: 'Eucalyptus Timber Fund',
    category: 'forestry',
    price: 250000,
    dailyRate: 2.60,
    periodDays: 60,
    maxPurchases: 3,
    totalSlots: 150,
    filledSlots: 40,
    description: 'Finance fast-growing eucalyptus plantations supplying timber to the construction sector and charcoal-replacement fuel producers.',
    afterDescription: 'Timber lease income is distributed daily throughout the investment cycle.',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
    sortOrder: 19,
  },
 
  // ─────────────────────────────────────────────
  // ROBOTICS
  // ─────────────────────────────────────────────
  {
    name: 'Agri Robotics Unit R-3',
    category: 'robotics',
    price: 500000,
    dailyRate: 4.10,
    periodDays: 30,
    maxPurchases: 1,
    totalSlots: 50,
    filledSlots: 45,
    description: 'Invest in automated irrigation and crop-monitoring robots deployed on commercial farms. Units are leased to farms at daily rates.',
    afterDescription: 'Robotics investments generate higher daily yield due to operational efficiency gains.',
    imageUrl: 'https://images.unsplash.com/photo-1581093588401-22b9a3f1f2f3?w=800&q=80',
    sortOrder: 20,
  },
  {
    name: 'Smart Greenhouse AI',
    category: 'robotics',
    price: 380000,
    dailyRate: 3.70,
    periodDays: 28,
    maxPurchases: 2,
    totalSlots: 50,
    filledSlots: 27,
    description: 'AI-powered greenhouse management units reducing labor costs and increasing yields by up to 40% for partner vegetable farms.',
    afterDescription: 'Returns are tied directly to farm output metrics tracked in real time.',
    imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&q=80',
    sortOrder: 21,
  },
  {
    name: 'Drone Spray Service Fleet',
    category: 'robotics',
    price: 450000,
    dailyRate: 3.90,
    periodDays: 35,
    maxPurchases: 1,
    totalSlots: 60,
    filledSlots: 12,
    description: 'Agricultural drone fleet offering precision pesticide and fertilizer spraying as a service across Rwandan districts. Revenue per flight-hour.',
    afterDescription: 'Service revenue is tracked digitally and credited daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80',
    sortOrder: 22,
  },
 
  // ─────────────────────────────────────────────
  // SOLAR ENERGY
  // ─────────────────────────────────────────────
  {
    name: 'Rooftop Solar Grid Share',
    category: 'solar_energy',
    price: 200000,
    dailyRate: 3.10,
    periodDays: 50,
    maxPurchases: 5,
    totalSlots: 500,
    filledSlots: 210,
    description: 'Own a share of rooftop solar installations on commercial buildings in Kigali. Energy sold to the grid and tenants under long-term contracts.',
    afterDescription: 'Daily electricity sales revenue is distributed proportionally to each investor.',
    imageUrl: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&q=80',
    sortOrder: 23,
  },
  {
    name: 'Off-Grid Rural Solar',
    category: 'solar_energy',
    price: 130000,
    dailyRate: 2.80,
    periodDays: 45,
    maxPurchases: 5,
    totalSlots: 400,
    filledSlots: 175,
    description: 'Finance solar home systems and mini-grids for off-grid rural communities. Revenue collected through pay-as-you-go subscription fees.',
    afterDescription: 'Subscription fee income is distributed daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80',
    sortOrder: 24,
  },
 
  // ─────────────────────────────────────────────
  // TECH INFRASTRUCTURE
  // ─────────────────────────────────────────────
  {
    name: 'Data Centre Rack Share',
    category: 'tech_infrastructure',
    price: 600000,
    dailyRate: 4.20,
    periodDays: 30,
    maxPurchases: 1,
    totalSlots: 40,
    filledSlots: 28,
    description: 'Own rack space in a tier-3 data centre in Kigali serving banks, telecoms, and government agencies. Leased at premium monthly rates.',
    afterDescription: 'Rack lease income is converted to daily returns and credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
    sortOrder: 25,
  },
  {
    name: 'Fibre Network Expansion',
    category: 'tech_infrastructure',
    price: 350000,
    dailyRate: 3.30,
    periodDays: 55,
    maxPurchases: 2,
    totalSlots: 100,
    filledSlots: 60,
    description: 'Fund the rollout of fibre broadband to secondary cities and industrial zones. Revenue from ISP wholesale access fees.',
    afterDescription: 'Wholesale access fees generate daily income credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
    sortOrder: 26,
  },
 
  // ─────────────────────────────────────────────
  // REAL ESTATE
  // ─────────────────────────────────────────────
  {
    name: 'Kigali Apartment REIT',
    category: 'real_estate',
    price: 500000,
    dailyRate: 3.50,
    periodDays: 60,
    maxPurchases: 2,
    totalSlots: 200,
    filledSlots: 85,
    description: 'Mini-REIT investing in mid-market residential apartments in Kigali. Tenants on 12-month leases provide steady rental income.',
    afterDescription: 'Rental income is pro-rated daily and deposited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    sortOrder: 27,
  },
  {
    name: 'Commercial Mall Unit',
    category: 'real_estate',
    price: 750000,
    dailyRate: 3.80,
    periodDays: 45,
    maxPurchases: 1,
    totalSlots: 60,
    filledSlots: 15,
    description: 'Own a fractional unit in a commercial shopping complex. Tenants include retail chains, banks, and food courts.',
    afterDescription: 'Daily retail lease income is credited directly to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&q=80',
    sortOrder: 28,
  },
  {
    name: 'Student Housing Bond',
    category: 'real_estate',
    price: 180000,
    dailyRate: 2.90,
    periodDays: 50,
    maxPurchases: 4,
    totalSlots: 300,
    filledSlots: 130,
    description: 'Finance purpose-built student hostels near major universities. Near-100% occupancy rates ensure consistent rental income.',
    afterDescription: 'Rental yields are distributed daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    sortOrder: 29,
  },
 
  // ─────────────────────────────────────────────
  // CONSTRUCTION
  // ─────────────────────────────────────────────
  {
    name: 'Road Construction Bond',
    category: 'construction',
    price: 400000,
    dailyRate: 3.20,
    periodDays: 60,
    maxPurchases: 2,
    totalSlots: 100,
    filledSlots: 20,
    description: 'Corporate bond financing a government-contracted road upgrade project in the Northern Province. Returns backed by government milestone payments.',
    afterDescription: 'Bond interest is calculated daily and credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    sortOrder: 30,
  },
  {
    name: 'Pre-Cast Concrete Plant',
    category: 'construction',
    price: 300000,
    dailyRate: 3.00,
    periodDays: 45,
    maxPurchases: 3,
    totalSlots: 120,
    filledSlots: 55,
    description: 'Invest in a pre-cast concrete manufacturing facility supplying housing developers. Rwanda\'s housing deficit drives consistent demand.',
    afterDescription: 'Production revenue is shared daily with investors into your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1590274853856-f22d5ee3d228?w=800&q=80',
    sortOrder: 31,
  },
 
  // ─────────────────────────────────────────────
  // IMPORT / EXPORT
  // ─────────────────────────────────────────────
  {
    name: 'Tea Export Finance',
    category: 'import_export',
    price: 220000,
    dailyRate: 3.10,
    periodDays: 40,
    maxPurchases: 3,
    totalSlots: 200,
    filledSlots: 88,
    description: 'Working capital for tea exporters shipping Rwanda\'s CTC and orthodox teas to UK and Middle Eastern buyers under confirmed letters of credit.',
    afterDescription: 'Export proceeds are distributed daily as the shipment lifecycle completes.',
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    sortOrder: 32,
  },
  {
    name: 'General Import Pool',
    category: 'import_export',
    price: 160000,
    dailyRate: 2.80,
    periodDays: 35,
    maxPurchases: 5,
    totalSlots: 300,
    filledSlots: 110,
    description: 'Pool financing for fast-moving consumer goods (FMCG) importers supplying Rwandan supermarkets. Short trade cycles ensure quick capital turnover.',
    afterDescription: 'Trade profits are distributed daily throughout the 35-day cycle.',
    imageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80',
    sortOrder: 33,
  },
 
  // ─────────────────────────────────────────────
  // LOGISTICS
  // ─────────────────────────────────────────────
  {
    name: 'Cold Chain Truck Fleet',
    category: 'logistics',
    price: 420000,
    dailyRate: 3.60,
    periodDays: 45,
    maxPurchases: 2,
    totalSlots: 80,
    filledSlots: 30,
    description: 'Finance refrigerated trucks transporting perishables — dairy, meat, vegetables — across Rwanda and into DRC and Uganda.',
    afterDescription: 'Daily freight revenue from truck operations is credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
    sortOrder: 34,
  },
  {
    name: 'Warehouse Storage REIT',
    category: 'logistics',
    price: 280000,
    dailyRate: 3.00,
    periodDays: 50,
    maxPurchases: 3,
    totalSlots: 150,
    filledSlots: 65,
    description: 'Own fractional units of bonded warehouses leased to importers and exporters near Kigali Logistics Hub. 95%+ occupancy rate historically.',
    afterDescription: 'Storage lease income is distributed daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80',
    sortOrder: 35,
  },
 
  // ─────────────────────────────────────────────
  // RETAIL
  // ─────────────────────────────────────────────
  {
    name: 'Supermarket Chain Bond',
    category: 'retail',
    price: 350000,
    dailyRate: 3.20,
    periodDays: 40,
    maxPurchases: 2,
    totalSlots: 100,
    filledSlots: 44,
    description: 'Corporate bond for a fast-expanding Rwandan supermarket chain opening 5 new branches. Bond secured against real estate assets.',
    afterDescription: 'Interest accrues daily and is credited to your profit wallet throughout the 40-day period.',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    sortOrder: 36,
  },
  {
    name: 'Fashion Retail Franchise',
    category: 'retail',
    price: 200000,
    dailyRate: 2.90,
    periodDays: 35,
    maxPurchases: 3,
    totalSlots: 200,
    filledSlots: 70,
    description: 'Invest in a local fashion retail franchise targeting Rwanda\'s growing middle-class. Outlets located in Kigali\'s busiest malls.',
    afterDescription: 'Daily sales revenue share is credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&q=80',
    sortOrder: 37,
  },
 
  // ─────────────────────────────────────────────
  // MICRO FINANCE
  // ─────────────────────────────────────────────
  {
    name: 'SME Micro-Loan Pool',
    category: 'micro_finance',
    price: 100000,
    dailyRate: 2.70,
    periodDays: 40,
    maxPurchases: 10,
    totalSlots: 1000,
    filledSlots: 450,
    description: 'Pool loans disbursed to vetted small businesses in Kigali and secondary cities. Average loan size 300,000 RWF at 18% annual interest.',
    afterDescription: 'Loan repayments are collected weekly and your daily share is credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80',
    sortOrder: 38,
  },
  {
    name: 'Women Entrepreneur Fund',
    category: 'micro_finance',
    price: 80000,
    dailyRate: 2.50,
    periodDays: 35,
    maxPurchases: 10,
    totalSlots: 1000,
    filledSlots: 620,
    description: 'Financing for women-led small businesses. Partner NGOs provide business training and loan guarantees, reducing default risk.',
    afterDescription: 'Daily returns from repaid interest are deposited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80',
    sortOrder: 39,
  },
 
  // ─────────────────────────────────────────────
  // HEALTHCARE
  // ─────────────────────────────────────────────
  {
    name: 'Private Clinic Expansion',
    category: 'healthcare',
    price: 400000,
    dailyRate: 3.40,
    periodDays: 55,
    maxPurchases: 2,
    totalSlots: 80,
    filledSlots: 22,
    description: 'Bond financing a private medical clinic adding 50 beds and diagnostic equipment to serve Kigali\'s growing insured population.',
    afterDescription: 'Patient revenue from the new wing is shared daily with bond holders.',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    sortOrder: 40,
  },
  {
    name: 'Medical Equipment Leasing',
    category: 'healthcare',
    price: 270000,
    dailyRate: 3.10,
    periodDays: 50,
    maxPurchases: 3,
    totalSlots: 120,
    filledSlots: 40,
    description: 'Lease diagnostic equipment (X-ray, ultrasound, lab analysers) to district hospitals under government framework contracts.',
    afterDescription: 'Lease income is distributed daily to your profit wallet for the full period.',
    imageUrl: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&q=80',
    sortOrder: 41,
  },
 
  // ─────────────────────────────────────────────
  // PHARMACEUTICALS
  // ─────────────────────────────────────────────
  {
    name: 'Generic Medicine Distribution',
    category: 'pharmaceuticals',
    price: 300000,
    dailyRate: 3.20,
    periodDays: 45,
    maxPurchases: 3,
    totalSlots: 150,
    filledSlots: 60,
    description: 'Working capital for a licensed pharmaceutical distributor supplying generic medicines to pharmacies and health centres nationwide.',
    afterDescription: 'Distribution margins are pooled and credited daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=800&q=80',
    sortOrder: 42,
  },
 
  // ─────────────────────────────────────────────
  // FOOD PROCESSING
  // ─────────────────────────────────────────────
  {
    name: 'Tomato Paste Factory',
    category: 'food_processing',
    price: 260000,
    dailyRate: 3.00,
    periodDays: 50,
    maxPurchases: 3,
    totalSlots: 150,
    filledSlots: 75,
    description: 'Invest in a tomato paste processing plant sourcing raw tomatoes from local farmers. Product sold to supermarkets, hotels, and exported.',
    afterDescription: 'Factory revenue is shared daily with investors and credited to the profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=800&q=80',
    sortOrder: 43,
  },
  {
    name: 'Cassava Flour Mill',
    category: 'food_processing',
    price: 190000,
    dailyRate: 2.80,
    periodDays: 45,
    maxPurchases: 4,
    totalSlots: 200,
    filledSlots: 90,
    description: 'Finance cassava flour milling operations supplying bakers and food manufacturers across East Africa. Cassava sourced from local smallholders.',
    afterDescription: 'Milling revenue is distributed daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    sortOrder: 44,
  },
 
  // ─────────────────────────────────────────────
  // BEVERAGES
  // ─────────────────────────────────────────────
  {
    name: 'Craft Brewery Bond',
    category: 'beverages',
    price: 320000,
    dailyRate: 3.30,
    periodDays: 40,
    maxPurchases: 2,
    totalSlots: 100,
    filledSlots: 35,
    description: 'Bond supporting a craft beer brewery supplying Kigali\'s hospitality sector. Production capacity doubling with this funding round.',
    afterDescription: 'Sales revenue bond interest is credited daily to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    sortOrder: 45,
  },
  {
    name: 'Fruit Juice Export Line',
    category: 'beverages',
    price: 210000,
    dailyRate: 2.90,
    periodDays: 45,
    maxPurchases: 3,
    totalSlots: 200,
    filledSlots: 55,
    description: 'Finance a new bottling line for mango, passion fruit, and pineapple juices destined for East African supermarket chains.',
    afterDescription: 'Export sales generate daily returns credited directly to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80',
    sortOrder: 46,
  },
 
  // ─────────────────────────────────────────────
  // EDUCATION
  // ─────────────────────────────────────────────
  {
    name: 'Private School Infrastructure',
    category: 'education',
    price: 350000,
    dailyRate: 3.00,
    periodDays: 60,
    maxPurchases: 2,
    totalSlots: 120,
    filledSlots: 30,
    description: 'Bond financing classroom blocks, labs, and ICT equipment for a private school group with 4 campuses across Rwanda.',
    afterDescription: 'School fee income services the bond, with daily interest credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80',
    sortOrder: 47,
  },
  {
    name: 'E-Learning Platform Series A',
    category: 'education',
    price: 150000,
    dailyRate: 2.70,
    periodDays: 40,
    maxPurchases: 5,
    totalSlots: 300,
    filledSlots: 95,
    description: 'Series A investment in a Kinyarwanda-language e-learning platform serving secondary school students across Rwanda and the region.',
    afterDescription: 'Subscription revenue is distributed daily to early-stage investors.',
    imageUrl: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80',
    sortOrder: 48,
  },
 
  // ─────────────────────────────────────────────
  // TOURISM
  // ─────────────────────────────────────────────
  {
    name: 'Eco-Lodge Safari Bond',
    category: 'tourism',
    price: 450000,
    dailyRate: 3.60,
    periodDays: 50,
    maxPurchases: 2,
    totalSlots: 80,
    filledSlots: 18,
    description: 'Finance an eco-lodge adjacent to Akagera National Park. Revenue from gorilla-trekking packages and international tourist bookings.',
    afterDescription: 'Daily booking revenue is shared with investors and credited to your profit wallet.',
    imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
    sortOrder: 49,
  },
  {
    name: 'City Hotel Expansion',
    category: 'tourism',
    price: 600000,
    dailyRate: 3.80,
    periodDays: 45,
    maxPurchases: 1,
    totalSlots: 60,
    filledSlots: 10,
    description: 'Fund the addition of 80 rooms to a 3-star city hotel in Kigali CBD. Rwanda\'s MICE tourism boom drives consistently high occupancy.',
    afterDescription: 'Room revenue is distributed daily to investors throughout the investment period.',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    sortOrder: 50,
  },
];
 
const SETTINGS = [
  { key: 'deposit_phone',           value: '+250793216191' },
  { key: 'deposit_phone_name',      value: 'Vision Core Ltd' },
  { key: 'min_recharge',            value: '5000' },
  { key: 'min_withdrawal',          value: '10000' },
  { key: 'max_withdrawal_per_day',  value: '50000' },
  { key: 'commission_level_a',      value: '8' },
  { key: 'commission_level_b',      value: '4' },
  { key: 'commission_level_c',      value: '2' },
  { key: 'commission_level_d',      value: '1' },
  { key: 'platform_name',           value: 'Vision Core' },
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

  const existing = await Admin.findOne({ email: 'vicky@visioncore.co.rw' });
  if (!existing) {
    await Admin.create({
      name: 'Super Admin',
      email: 'vicky@visioncore.co.rw',
      passwordHash: await bcrypt.hash('Vicky@20071', 12),
      role: 'super_admin',
    });
    console.log('✓ Default admin created: vicky@visioncore.co.rw / Vicky@20071');
  }

  console.log('Seeding complete!');
  await mongoose.disconnect();
})();
