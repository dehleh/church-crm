const express = require('express');
const router = express.Router();
const c = require('../controllers/assetsController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/stats', c.getAssetStats);
router.get('/', c.getAssets);
router.get('/:id', c.getAsset);

router.post('/', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('name').notEmpty().trim().escape(),
  body('category').optional().isIn(['furniture', 'musical_instrument', 'electronics', 'media', 'vehicle', 'building', 'equipment', 'general', 'other']),
  body('quantity').optional().isInt({ min: 1 }),
  body('condition').optional().isIn(['good', 'fair', 'poor', 'needs_repair', 'decommissioned']),
  body('status').optional().isIn(['active', 'in_use', 'in_storage', 'under_repair', 'disposed']),
  body('purchasePrice').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('currentValue').optional({ values: 'null' }).isFloat({ min: 0 }),
], handleValidationErrors, c.createAsset);

router.put('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('name').optional().trim().escape(),
  body('category').optional().isIn(['furniture', 'musical_instrument', 'electronics', 'media', 'vehicle', 'building', 'equipment', 'general', 'other']),
  body('quantity').optional().isInt({ min: 1 }),
  body('condition').optional().isIn(['good', 'fair', 'poor', 'needs_repair', 'decommissioned']),
  body('status').optional().isIn(['active', 'in_use', 'in_storage', 'under_repair', 'disposed']),
  body('purchasePrice').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('currentValue').optional({ values: 'null' }).isFloat({ min: 0 }),
], handleValidationErrors, c.updateAsset);

router.delete('/:id', authorize('head_pastor', 'pastor'), c.deleteAsset);

module.exports = router;
