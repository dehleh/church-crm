const express = require('express');
const router = express.Router();
const c = require('../controllers/servicePlansController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

// List and view service plans
router.get('/', authorize('admin', 'pastor', 'director', 'hod', 'member'), c.listServicePlans);
router.get('/:id', authorize('admin', 'pastor', 'director', 'hod', 'member'), c.getServicePlan);

// Manage service plans
router.post('/', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('title').notEmpty().trim().escape(),
  body('serviceDate').notEmpty(),
  body('startTime').notEmpty(),
], handleValidationErrors, c.createServicePlan);

router.put('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), c.updateServicePlan);
router.delete('/:id', authorize('head_pastor', 'pastor', 'director'), c.deleteServicePlan);

// Run-sheet timeline
router.put('/:id/items', authorize('head_pastor', 'pastor', 'director', 'hod'), c.updateRunSheetItems);

// Volunteer roster
router.post('/:id/volunteers', authorize('head_pastor', 'pastor', 'director', 'hod'), c.addVolunteer);
router.delete('/:id/volunteers/:volunteerId', authorize('head_pastor', 'pastor', 'director', 'hod'), c.removeVolunteer);
router.patch('/:id/volunteers/:volunteerId/status', authorize('head_pastor', 'pastor', 'director', 'hod', 'member'), c.updateVolunteerStatus);
router.post('/:id/volunteers/remind', authorize('head_pastor', 'pastor', 'director', 'hod'), c.sendVolunteerReminders);

module.exports = router;
