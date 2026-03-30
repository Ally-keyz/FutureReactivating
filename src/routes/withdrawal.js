const router = require('express').Router();
const ctrl = require('../controllers/withdrawalController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);
router.post('/',    ctrl.storeRules, validate, ctrl.store);
router.get('/',     ctrl.index);
router.get('/:id',  ctrl.show);

module.exports = router;
