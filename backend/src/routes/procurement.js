const express = require('express');
const router = express.Router();
const c = require('../controllers/procurementController');
const { authenticate, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

// Stats
router.get('/stats', c.getProcurementStats);

// ── Requisitions ──
router.get('/requisitions', c.getRequisitions);
router.post('/requisitions', [
  body('title').notEmpty().withMessage('Title is required'),
  body('requisitionMonth').notEmpty().withMessage('Month is required'),
], handleValidationErrors, c.createRequisition);
router.patch('/requisitions/:id', [
  param('id').isUUID(),
  body('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected']),
], handleValidationErrors, c.updateRequisition);

// ── Purchase Requests ──
router.get('/purchase-requests', c.getPurchaseRequests);
router.post('/purchase-requests', [
  body('title').notEmpty().withMessage('Title is required'),
  body('totalAmount').notEmpty().withMessage('Amount is required'),
], handleValidationErrors, c.createPurchaseRequest);
router.patch('/purchase-requests/:id', authorize('head_pastor', 'pastor', 'director'), [
  param('id').isUUID(),
  body('status').optional().isIn(['pending', 'reviewed', 'approved', 'purchased', 'rejected']),
], handleValidationErrors, c.reviewPurchaseRequest);

module.exports = router;
