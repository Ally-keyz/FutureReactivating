const router = require('express').Router();
const ctrl = require('../controllers/teamController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/',             ctrl.overview);
router.get('/members',      ctrl.members);
router.get('/commissions',  ctrl.commissions);

module.exports = router;
