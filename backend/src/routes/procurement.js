const express = require('express');
const router = express.Router();
const c = require('../controllers/procurementController');
const { authenticate, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

// Stats
router.get('/stats', authorize('admin', 'pastor', 'director', 'finance', 'hod'), c.getProcurementStats);

// ── Requisitions ──
router.get('/requisitions', authorize('admin', 'pastor', 'director', 'finance', 'hod'), c.getRequisitions);
router.post('/requisitions', authorize('admin', 'pastor', 'director', 'hod'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('requisitionMonth').notEmpty().withMessage('Month is required'),
], handleValidationErrors, c.createRequisition);
router.patch('/requisitions/:id', authorize('admin', 'pastor', 'director', 'finance', 'hod'), [
  param('id').isUUID(),
  body('status').optional().isIn(['draft', 'submitted', 'approved', 'disputed', 'correction', 'rejected', 'disbursed']),
], handleValidationErrors, c.updateRequisition);
router.post('/requisitions/:id/disburse', authorize('admin', 'pastor', 'director', 'finance'), [
  param('id').isUUID(),
], handleValidationErrors, c.disburseRequisition);

// Banks & Account Verification
router.get('/banks', authorize('admin', 'pastor', 'director', 'finance', 'hod'), c.getBanks);
router.get('/resolve-account', authorize('admin', 'pastor', 'director', 'finance', 'hod'), c.resolveAccountName);

// ── Purchase Requests ──
router.get('/purchase-requests', authorize('admin', 'pastor', 'director', 'finance', 'hod'), c.getPurchaseRequests);
router.post('/purchase-requests', authorize('admin', 'pastor', 'director', 'finance', 'hod'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('totalAmount').notEmpty().withMessage('Amount is required'),
], handleValidationErrors, c.createPurchaseRequest);
router.patch('/purchase-requests/:id', authorize('admin', 'pastor', 'director', 'finance'), [
  param('id').isUUID(),
  body('status').optional().isIn(['pending', 'reviewed', 'approved', 'purchased', 'rejected']),
], handleValidationErrors, c.reviewPurchaseRequest);

// CSV Import
const csv = require('../controllers/csvImportController');
router.post('/requisitions/import', authorize('admin', 'finance'), csv.importRequisitions);
router.post('/purchase-requests/import', authorize('admin', 'finance'), csv.importPurchaseRequests);

module.exports = router;
