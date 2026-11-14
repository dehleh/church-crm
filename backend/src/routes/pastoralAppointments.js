const router = require('express').Router();
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const ctrl = require('../controllers/pastoralAppointmentsController');

// All staff routes require authentication and pastoral / admin / director role
router.use(authenticate);
router.use(authorize('admin', 'pastor', 'director', 'hod'));

router.get('/', ctrl.listAppointments);
router.get('/:id', [param('id').isUUID(), handleValidationErrors], ctrl.getAppointment);

router.post(
  '/',
  [
    body('meetingTime').notEmpty().withMessage('Meeting date and time is required'),
    handleValidationErrors,
  ],
  ctrl.createAppointment
);

router.patch(
  '/:id/status',
  [
    param('id').isUUID().withMessage('Invalid appointment ID'),
    body('status').isIn(['pending', 'acknowledged', 'completed', 'cancelled']).withMessage('Invalid status'),
    handleValidationErrors,
  ],
  ctrl.updateAppointmentStatus
);

router.post(
  '/:id/resend',
  [param('id').isUUID(), handleValidationErrors],
  ctrl.resendNotification
);

router.delete(
  '/:id',
  [param('id').isUUID(), handleValidationErrors],
  ctrl.deleteAppointment
);

module.exports = router;
