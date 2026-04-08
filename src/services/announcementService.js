const Announcement = require('../models/Announcements');

/**
 * Return all live announcements (for regular users).
 * "Live" = isActive true, startsAt <= now < expiresAt
 */
async function getLive({ page = 1, limit = 20 } = {}) {
  const now = new Date();
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Announcement.find({
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gt: now },
    })
      .sort({ isPinned: -1, startsAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),

    Announcement.countDocuments({
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gt: now },
    }),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

/**
 * Admin: get all announcements with optional filters.
 */
async function getAll({ page = 1, limit = 20, status } = {}) {
  const skip = (page - 1) * limit;
  const now  = new Date();

  let filter = {};
  if (status === 'live')    filter = { isActive: true,  startsAt: { $lte: now }, expiresAt: { $gt: now }  };
  if (status === 'expired') filter = { expiresAt: { $lte: now } };
  if (status === 'inactive') filter = { isActive: false };
  if (status === 'upcoming') filter = { isActive: true, startsAt: { $gt: now } };

  const [items, total] = await Promise.all([
    Announcement.find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'fullName email')
      .lean({ virtuals: true }),
    Announcement.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

/**
 * Get a single announcement by id.
 */
async function getById(id) {
  return Announcement.findById(id)
    .populate('createdBy', 'fullName email')
    .lean({ virtuals: true });
}

/**
 * Create a new announcement (admin only).
 */
async function create({ title, body, type, emoji, startsAt, expiresAt, isPinned, ctaLabel, ctaUrl, adminId }) {
  const ann = await Announcement.create({
    title,
    body,
    type:      type      || 'info',
    emoji:     emoji     || '📢',
    startsAt:  startsAt  ? new Date(startsAt) : new Date(),
    expiresAt: new Date(expiresAt),
    isPinned:  !!isPinned,
    ctaLabel:  ctaLabel  || '',
    ctaUrl:    ctaUrl    || '',
    createdBy: adminId,
    isActive: true,
  });
  return ann;
}

/**
 * Update an announcement (admin only).
 */
async function update(id, fields) {
  const allowed = ['title','body','type','emoji','startsAt','expiresAt','isPinned','ctaLabel','ctaUrl','isActive'];
  const update  = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      update[key] = (key === 'startsAt' || key === 'expiresAt') ? new Date(fields[key]) : fields[key];
    }
  }
  const ann = await Announcement.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    .populate('createdBy', 'fullName email')
    .lean({ virtuals: true });
  return ann;
}

/**
 * Soft-delete / deactivate an announcement.
 */
async function deactivate(id) {
  return Announcement.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
}

/**
 * Hard-delete an announcement.
 */
async function remove(id) {
  return Announcement.findByIdAndDelete(id);
}

/**
 * Return a quick count summary for the admin dashboard.
 */
async function stats() {
  const now = new Date();
  const [live, total, expired, upcoming] = await Promise.all([
    Announcement.countDocuments({ isActive: true, startsAt: { $lte: now }, expiresAt: { $gt: now } }),
    Announcement.countDocuments({}),
    Announcement.countDocuments({ expiresAt: { $lte: now } }),
    Announcement.countDocuments({ isActive: true, startsAt: { $gt: now } }),
  ]);
  return { live, total, expired, upcoming };
}

module.exports = { getLive, getAll, getById, create, update, deactivate, remove, stats };