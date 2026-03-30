/**
 * Expire Investments Job
 * Marks investments past their endsAt date as completed.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Investment = require('../models/Investment');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const run = async () => {
  const now = new Date();
  logger.info('[ExpireInvestmentsJob] Running...');

  const expired = await Investment.find({ status: 'pending', endsAt: { $lt: now } }).lean();

  for (const inv of expired) {
    await Investment.findByIdAndUpdate(inv._id, { status: 'completed', completedAt: new Date() });
    notificationService.send(inv.userId, 'info', 'Investment Period Ended',
      `Investment period has ended. Check your earnings summary.`
    ).catch(() => {});
    logger.info(`  Expired investment ${inv._id}`);
  }

  logger.info(`[ExpireInvestmentsJob] Done. ${expired.length} investments expired.`);
};

if (require.main === module) {
  connectDB().then(run).then(() => mongoose.disconnect()).catch(console.error);
}

module.exports = { run };
