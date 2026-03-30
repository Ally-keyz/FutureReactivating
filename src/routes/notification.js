const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/',              ctrl.index);
router.patch('/:id/read',    ctrl.markRead);
router.post('/read-all',     ctrl.readAll);
router.delete('/:id',        ctrl.destroy);

module.exports = router;
