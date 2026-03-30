/**
 * Daily Income Job
 * Automatically credits daily income for all active investments.
 *
 * Run standalone:  node src/jobs/dailyIncomeJob.js
 * Or via cron (node-cron) started inside server.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Investment = require('../models/Investment');
const { Wallet } = require('../models/User');
const walletService = require('../services/walletService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const { todayString, addDays } = require('../utils/dateHelper');

const run = async () => {
  const today = todayString();
  logger.info(`[DailyIncomeJob] Starting for ${today}`);

  const investments = await Investment.find({
    status: 'pending',
    $or: [{ lastEarnedDate: { $ne: today } }, { lastEarnedDate: null }],
    endsAt: { $gte: new Date(today) },
  }).lean();

  logger.info(`[DailyIncomeJob] Found ${investments.length} investments to process`);

  let credited = 0, completed = 0, errors = 0;

  for (const inv of investments) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const amount = inv.dailyIncome;
      const newCompleted = inv.daysCompleted + 1;
      const newEarned = parseFloat((inv.totalEarned + amount).toFixed(2));
      const isComplete = newCompleted >= inv.periodDays;

      await walletService.credit(
        inv.walletId, inv.userId, amount, 'daily_income', inv._id,
        `Auto daily income — day ${newCompleted}`, session
      );

      await Investment.findByIdAndUpdate(inv._id, {
        daysCompleted: newCompleted,
        totalEarned: newEarned,
        lastEarnedDate: today,
        status: isComplete ? 'completed' : 'pending',
        completedAt: isComplete ? new Date() : null,
      }, { session });

      await session.commitTransaction();

      if (isComplete) {
        notificationService.send(inv.userId, 'success', 'Investment Completed!',
          `Investment has matured. Total earned: ${newEarned.toLocaleString()} RWF released to your wallet.`
        ).catch(() => {});
        completed++;
      } else {
        notificationService.send(inv.userId, 'reward', 'Daily Income Credited',
          `${amount.toLocaleString()} RWF added to your wallet. Day ${newCompleted}/${inv.periodDays}.`
        ).catch(() => {});
      }

      credited++;
      logger.info(`  ✓ Investment ${inv._id} user ${inv.userId} +${amount} RWF [${isComplete ? 'completed' : 'pending'}]`);
    } catch (err) {
      await session.abortTransaction();
      errors++;
      logger.error(`  ✗ Investment ${inv._id} FAILED: ${err.message}`);
    } finally {
      session.endSession();
    }
  }

  logger.info(`[DailyIncomeJob] Done. credited=${credited}, completed=${completed}, errors=${errors}`);
};

// Run standalone
if (require.main === module) {
  connectDB().then(run).then(() => mongoose.disconnect()).catch(console.error);
}

module.exports = { run };
