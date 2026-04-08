/**
 * Admin announcement routes — mount inside your existing admin router.
 *
 * Example in routes/admin.js:
 *   const announcementAdminRoutes = require('./adminAnnouncement');
 *   router.use('/announcements', announcementAdminRoutes);
 *
 * All routes here inherit protectAdmin from the parent admin router.
 * If you mount this file directly, add protectAdmin middleware here too.
 */

const express = require('express');
const router  = express.Router();
const {
  adminGetAll,
  adminStats,
  adminGetOne,
  adminCreate,
  adminUpdate,
  adminDeactivate,
  adminDelete,
} = require('../controllers/announcementController');

// GET  /api/admin/announcements/stats   — must come before /:id
router.get('/stats',           adminStats);

// GET  /api/admin/announcements         — list with optional ?status=live|expired|upcoming|inactive
router.get('/',                adminGetAll);

// GET  /api/admin/announcements/:id
router.get('/:id',             adminGetOne);

// POST /api/admin/announcements
router.post('/',               adminCreate);

// PATCH /api/admin/announcements/:id
router.patch('/:id',           adminUpdate);

// PATCH /api/admin/announcements/:id/deactivate
router.patch('/:id/deactivate', adminDeactivate);

// DELETE /api/admin/announcements/:id
router.delete('/:id',          adminDelete);

module.exports = router;