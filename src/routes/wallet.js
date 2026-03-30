const router = require('express').Router();
const ctrl = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/',             ctrl.index);
router.get('/transactions', ctrl.transactions);

module.exports = router;
