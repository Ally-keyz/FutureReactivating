const Setting = require('../models/Setting');

let cache = {};
let lastLoaded = 0;
const TTL = 60000; // 1-minute cache

const getAll = async () => {
  if (Date.now() - lastLoaded > TTL) {
    const rows = await Setting.find().lean();
    cache = Object.fromEntries(rows.map(r => [r.key, r.value]));
    lastLoaded = Date.now();
  }
  return cache;
};

const get = async (key, fallback = '') => {
  const all = await getAll();
  return all[key] ?? fallback;
};

const set = async (key, value) => {
  cache = {}; // invalidate
  return Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
};

const setMany = async (obj) => {
  cache = {};
  const ops = Object.entries(obj).map(([key, value]) => ({
    updateOne: { filter: { key }, update: { $set: { value } }, upsert: true }
  }));
  return Setting.bulkWrite(ops);
};

module.exports = { get, getAll, set, setMany };
