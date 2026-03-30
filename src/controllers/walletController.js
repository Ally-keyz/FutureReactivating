const Transaction = require('../models/Transaction');
const walletService = require('../services/walletService');
const { success, error } = require('../utils/response');

exports.index = async (req, res) => {
  try {
    const wallets = await walletService.getUserWallets(req.user._id);
    return success(res, wallets);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.transactions = async (req, res) => {
  try {
    const { type, walletType, page = 1 } = req.query;
    const limit = 20;
    const skip = (parseInt(page) - 1) * limit;

    const match = { userId: req.user._id };
    if (type) match.type = type;

    let pipeline = [{ $match: match }];

    if (walletType) {
      // Join with wallets to filter by type
      pipeline = [
        { $match: match },
        { $lookup: { from: 'wallets', localField: 'walletId', foreignField: '_id', as: 'wallet' } },
        { $unwind: '$wallet' },
        { $match: { 'wallet.type': walletType } },
      ];
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      }}
    );

    const [result] = await Transaction.aggregate(pipeline);
    return success(res, {
      data: result.data,
      total: result.total[0]?.count || 0,
      page: parseInt(page),
      limit,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};
