const { body } = require('express-validator');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Investment = require('../models/Investment');
const { success, error } = require('../utils/response');

exports.index = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;

    const products = await Product.find(filter).sort({ sortOrder: 1 }).lean();

    // Attach how many times this user has purchased each product
    const enriched = await Promise.all(products.map(async (p) => {
      const [userPurchases] = await Investment.aggregate([
        { $match: { userId: req.user._id, productId: p._id, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, qty: { $sum: '$quantity' } } }
      ]);
      return {
        ...p,
        investedPercent: Math.round((p.filledSlots / p.totalSlots) * 100),
        userPurchases: userPurchases?.qty || 0,
      };
    }));

    return success(res, enriched);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.show = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!product) return error(res, 'Product not found', 404);
    return success(res, {
      ...product,
      investedPercent: Math.round((product.filledSlots / product.totalSlots) * 100),
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};
