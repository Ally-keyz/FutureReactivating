const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);
router.get('/profile',       ctrl.profile);
router.get('/stats',         ctrl.stats);
router.put('/password',      ctrl.changePasswordRules, validate, ctrl.changePassword);
router.put('/withdraw-pin',  ctrl.setWithdrawPinRules, validate, ctrl.setWithdrawPin);

module.exports = router;
