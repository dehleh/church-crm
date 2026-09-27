const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const c = require('../controllers/welfareController');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Stats
router.get('/stats', authorize('admin', 'pastor', 'director', 'finance'), c.getWelfareStats);

// Packages
router.get('/packages', authorize('admin', 'pastor', 'director', 'finance', 'hod'), c.getPackages);
router.post('/packages', authorize('admin', 'pastor', 'director'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('packageType').optional().isIn(['financial', 'material', 'medical', 'educational', 'other'])
], handleValidationErrors, c.createPackage);

// Applications
router.get('/applications', authorize('admin', 'pastor', 'director', 'finance'), c.getApplications);
router.post('/applications', authorize('admin', 'pastor', 'director', 'finance', 'hod'), [
  body('packageId').notEmpty().withMessage('Package is required'),
  body('reason').notEmpty().withMessage('Reason is required')
], handleValidationErrors, c.createApplication);
router.patch('/applications/:id', authorize('admin', 'pastor', 'director', 'finance'), [
  param('id').isUUID(),
  body('status').optional().isIn(['pending', 'under_review', 'approved', 'disbursed', 'rejected'])
], handleValidationErrors, c.reviewApplication);

module.exports = router;
