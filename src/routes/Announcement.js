const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const { getLive } = require('../controllers/announcementController');

/**
 * GET /api/announcements
 * Returns live (active + not expired) announcements for the authenticated user.
 * Query params: ?page=1&limit=20
 */
router.get('/', protect, getLive);

module.exports = router;