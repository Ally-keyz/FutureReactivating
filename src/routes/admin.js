const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, ctrl.login);

// All below require admin JWT
router.use(protectAdmin);

router.get('/dashboard',                    ctrl.dashboard);
router.get('/users',                        ctrl.users);
router.get('/users/:id',                    ctrl.userDetail);

router.get('/recharges',                    ctrl.recharges);
router.patch('/recharges/:id/approve',      ctrl.approveRecharge);
router.patch('/recharges/:id/reject',       ctrl.rejectRecharge);

router.get('/withdrawals',                  ctrl.withdrawals);
router.patch('/withdrawals/:id/approve',    ctrl.approveWithdrawal);
router.patch('/withdrawals/:id/reject',     ctrl.rejectWithdrawal);

router.get('/products',                     ctrl.getProducts);
router.post('/products',                    ctrl.createProduct);
router.put('/products/:id',                 ctrl.updateProduct);
router.delete('/products/:id',              ctrl.deleteProduct);

router.get('/settings',                     ctrl.getSettings);
router.put('/settings',                     ctrl.updateSettings);

module.exports = router;
