const router = require('express').Router();
const ctrl = require('../controllers/productController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/',    ctrl.index);
router.get('/:id', ctrl.show);

module.exports = router;
