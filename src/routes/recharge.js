const router = require('express').Router();
const ctrl = require('../controllers/rechargeController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const mongoose = require('mongoose');
const { success, error } = require('../utils/response');

router.use(protect);
router.get('/deposit-info', ctrl.depositInfo);
router.post('/',             ctrl.storeRules, validate, ctrl.store);
router.get('/',              ctrl.index);
router.get('/:id',           ctrl.show);
router.patch('/:id/reject',  ctrl.reject);

// approve needs a real (req, res) wrapper because ctrl.approve is a service fn
router.patch('/:id/approve', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const RechargeRequest = require('../models/RechargeRequest');
    const request = await RechargeRequest.findOne(
      { _id: req.params.id, status: 'pending' },
      null,
      { session }
    );
    if (!request) {
      await session.abortTransaction();
      return error(res, 'Request not found or already processed', 404);
    }

    await ctrl.approve(request.userId, request._id, request.amount, session);

    request.status    = 'approved';
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await request.save({ session });

    await session.commitTransaction();

    const notificationService = require('../services/notificationService');
    notificationService.send(
      request.userId, 'success', 'Deposit Approved',
      `Your deposit of ${request.amount.toLocaleString()} RWF (Ref: ${request.referenceCode}) has been approved.`
    ).catch(() => {});

    return success(res, { id: request._id, status: 'approved' }, 'Recharge approved');
  } catch (err) {
    await session.abortTransaction();
    return error(res, err.message, 500);
  } finally {
    session.endSession();
  }
});

module.exports = router;