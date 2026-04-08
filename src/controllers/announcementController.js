const announcementService = require('../services/announcementService');
const { success, error }   = require('../utils/response');

// ── User-facing ───────────────────────────────────────────────

/**
 * GET /api/announcements
 * Returns all currently live announcements for authenticated users.
 */
const getLive = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const data  = await announcementService.getLive({ page, limit });
    return success(res, data, 'Announcements fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Admin-facing ──────────────────────────────────────────────

/**
 * GET /api/admin/announcements
 * Admin: get all announcements with optional ?status= filter.
 */
const adminGetAll = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)   || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const status = req.query.status || null;
    const data   = await announcementService.getAll({ page, limit, status });
    return success(res, data, 'Announcements fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/admin/announcements/stats
 * Admin: count summary.
 */
const adminStats = async (req, res) => {
  try {
    const data = await announcementService.stats();
    return success(res, data, 'Stats fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/admin/announcements/:id
 */
const adminGetOne = async (req, res) => {
  try {
    const ann = await announcementService.getById(req.params.id);
    if (!ann) return error(res, 'Announcement not found', 404);
    return success(res, ann);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * POST /api/admin/announcements
 * Body: { title, body, type, emoji, startsAt, expiresAt, isPinned, ctaLabel, ctaUrl }
 */
const adminCreate = async (req, res) => {
  try {
    const { title, body, type, emoji, startsAt, expiresAt, isPinned, ctaLabel, ctaUrl } = req.body;

    if (!title || !body || !expiresAt) {
      return error(res, 'title, body, and expiresAt are required', 400);
    }

    if (new Date(expiresAt) <= new Date(startsAt || Date.now())) {
      return error(res, 'expiresAt must be in the future and after startsAt', 400);
    }

    const ann = await announcementService.create({
      title, body, type, emoji, startsAt, expiresAt, isPinned, ctaLabel, ctaUrl,
      adminId: req.admin._id,
    });

    return success(res, ann, 'Announcement created', 201);
  } catch (err) {
    return error(res, err.message, 400);
  }
};

/**
 * PATCH /api/admin/announcements/:id
 */
const adminUpdate = async (req, res) => {
  try {
    const ann = await announcementService.getById(req.params.id);
    if (!ann) return error(res, 'Announcement not found', 404);

    const updated = await announcementService.update(req.params.id, req.body);
    return success(res, updated, 'Announcement updated');
  } catch (err) {
    return error(res, err.message, 400);
  }
};

/**
 * PATCH /api/admin/announcements/:id/deactivate
 */
const adminDeactivate = async (req, res) => {
  try {
    const ann = await announcementService.deactivate(req.params.id);
    if (!ann) return error(res, 'Announcement not found', 404);
    return success(res, ann, 'Announcement deactivated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * DELETE /api/admin/announcements/:id
 */
const adminDelete = async (req, res) => {
  try {
    const ann = await announcementService.remove(req.params.id);
    if (!ann) return error(res, 'Announcement not found', 404);
    return success(res, null, 'Announcement deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = {
  getLive,
  adminGetAll,
  adminStats,
  adminGetOne,
  adminCreate,
  adminUpdate,
  adminDeactivate,
  adminDelete,
};