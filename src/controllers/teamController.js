const { User, Wallet } = require('../models/User');
const Commission = require('../models/Commission');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const { success, error } = require('../utils/response');

const COMMISSION_RATES = { 1: '8%', 2: '4%', 3: '2%', 4: '1%' };

exports.overview = async (req, res) => {
  try {
    const levels = {};
    let currentIds = [req.user._id];

    for (let level = 1; level <= 4; level++) {
      const members = await User.find({ referredBy: { $in: currentIds } })
        .select('_id').lean();
      const memberIds = members.map(m => m._id);

      let totalAssets = 0;
      if (memberIds.length > 0) {
        const [agg] = await Wallet.aggregate([
          { $match: { userId: { $in: memberIds } } },
          { $group: { _id: null, total: { $sum: '$balance' } } }
        ]);
        totalAssets = agg?.total || 0;
      }

      levels[`level_${level}`] = {
        count: memberIds.length,
        assets: totalAssets,
        rate: COMMISSION_RATES[level],
      };

      if (memberIds.length === 0) break;
      currentIds = memberIds;
    }

    // Stats for the current user
    const [stats] = await Transaction.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
        _id: null,
        totalReturn: { $sum: { $cond: [{ $in: ['$type', ['daily_income', 'team_commission']] }, '$amount', 0] } },
        totalInvestment: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'investment'] }, { $eq: ['$direction', 'debit'] }] }, '$amount', 0] } },
        teamIncome: { $sum: { $cond: [{ $eq: ['$type', 'team_commission'] }, '$amount', 0] } },
      }}
    ]);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [todayStats] = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'daily_income', createdAt: { $gte: todayStart } } },
      { $group: { _id: null, todayEarnings: { $sum: '$amount' } } }
    ]);

    const totalMembers = Object.values(levels).reduce((s, l) => s + l.count, 0);
    const totalAssets = Object.values(levels).reduce((s, l) => s + l.assets, 0);

    return success(res, {
      levels,
      totalMembers,
      totalAssets,
      stats: {
        totalReturn: stats?.totalReturn || 0,
        todayEarnings: todayStats?.todayEarnings || 0,
        totalInvestment: stats?.totalInvestment || 0,
        teamIncome: stats?.teamIncome || 0,
      },
      inviteCode: req.user.referralCode,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.members = async (req, res) => {
  try {
    const members = await User.find({ referredBy: req.user._id })
      .select('uid fullName phone memberLevel createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(members.map(async (m) => {
      const [inv] = await Investment.aggregate([
        { $match: { userId: m._id, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalCost' } } }
      ]);
      return { ...m, totalInvested: inv?.total || 0 };
    }));

    return success(res, enriched);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.commissions = async (req, res) => {
  try {
    const commissions = await Commission.find({ earnerId: req.user._id })
      .populate('sourceUserId', 'fullName uid')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return success(res, commissions);
  } catch (err) {
    return error(res, err.message, 500);
  }
};
