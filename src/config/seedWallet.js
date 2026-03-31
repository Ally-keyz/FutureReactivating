// scripts/seedWallets.js
const mongoose = require('mongoose');
const { User, Wallet } = require('../models/User');
const dotenv = require("dotenv");

dotenv.config();
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}, '_id');
  let seeded = 0;

  for (const u of users) {
    for (const type of ['balance', 'profit', 'bonus']) {
      const result = await Wallet.updateOne(
        { userId: u._id, type },
        { $setOnInsert: { userId: u._id, type, balance: 0 } },
        { upsert: true }
      );
      if (result.upsertedCount) seeded++;
    }
  }

  console.log(`Done — seeded ${seeded} missing wallets for ${users.length} users`);
  await mongoose.disconnect();
}

run().catch(console.error);