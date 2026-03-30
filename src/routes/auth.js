const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, ctrl.registerRules, validate, ctrl.register);
router.post('/login',    authLimiter, ctrl.loginRules,    validate, ctrl.login);
router.post('/logout',   protect, ctrl.logout);
router.post('/refresh',  ctrl.refresh);

module.exports = router;
