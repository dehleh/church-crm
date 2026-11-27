const express = require('express');
const router = express.Router();
const c = require('../controllers/assetsController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload, uploadFor } = require('../middleware/upload');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

// Asset stats & list
router.get('/stats', authorize('admin', 'pastor', 'director', 'hod'), c.getAssetStats);
router.get('/', authorize('admin', 'pastor', 'director', 'hod'), c.getAssets);

// Facility Incidents & Whistleblower damage reporting
router.get('/incidents/stats', authorize('admin', 'pastor', 'director', 'hod'), c.getIncidentStats);
router.get('/incidents', authorize('admin', 'pastor', 'director', 'hod'), c.getIncidents);
router.post('/incidents', [
  body('facilityLocation').notEmpty().trim(),
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
], handleValidationErrors, c.reportIncident);
router.patch('/incidents/:id/status', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor', 'director', 'hod'), c.updateIncidentStatus);

// Photo upload for assets & incidents
router.post('/upload-photo', uploadFor('media'), upload.single('photo'), c.uploadAssetPhoto);

router.get('/:id', authorize('admin', 'pastor', 'director', 'hod'), c.getAsset);

router.post('/', authorize('admin', 'pastor', 'director', 'hod'), [
  body('name').notEmpty().trim().escape(),
  body('category').optional().isIn(['furniture', 'musical_instrument', 'electronics', 'media', 'vehicle', 'building', 'equipment', 'general', 'other']),
  body('quantity').optional().isInt({ min: 1 }),
  body('condition').optional().isIn(['good', 'fair', 'poor', 'needs_repair', 'decommissioned']),
  body('status').optional().isIn(['active', 'in_use', 'in_storage', 'under_repair', 'disposed']),
  body('purchasePrice').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('currentValue').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('departmentId').optional({ values: 'null' }).custom(v => !v || typeof v === 'string'),
  body('photoUrl').optional({ values: 'null' }).isString(),
], handleValidationErrors, c.createAsset);

router.put('/:id', authorize('admin', 'head_pastor', 'pastor', 'director', 'hod'), [
  body('name').optional().trim().escape(),
  body('category').optional().isIn(['furniture', 'musical_instrument', 'electronics', 'media', 'vehicle', 'building', 'equipment', 'general', 'other']),
  body('quantity').optional().isInt({ min: 1 }),
  body('condition').optional().isIn(['good', 'fair', 'poor', 'needs_repair', 'decommissioned']),
  body('status').optional().isIn(['active', 'in_use', 'in_storage', 'under_repair', 'disposed']),
  body('purchasePrice').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('currentValue').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('departmentId').optional({ values: 'null' }).custom(v => !v || typeof v === 'string'),
  body('photoUrl').optional({ values: 'null' }).isString(),
], handleValidationErrors, c.updateAsset);

router.delete('/:id', authorize('admin', 'head_pastor', 'pastor'), c.deleteAsset);

module.exports = router;
