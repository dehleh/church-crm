const router = require('express').Router();
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const ctrl = require('../controllers/campaignsController');

// ── Public Routes (No Auth) ────────────────────────────────────
router.get('/public/:churchSlug', ctrl.getPublicCampaigns);
router.get('/public/:churchSlug/:campaignSlug', ctrl.getPublicCampaignBySlug);

// ── Staff & Leadership Routes (Admin, Pastor, Finance) ─────────
router.use(authenticate);
router.use(authorize('admin', 'pastor', 'finance'));

router.get('/', ctrl.listCampaigns);
router.get('/:id', ctrl.getCampaignById);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Campaign title is required'),
    body('targetAmount').optional().isNumeric().withMessage('Target amount must be a number'),
    handleValidationErrors,
  ],
  ctrl.createCampaign
);

router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid campaign ID'),
    handleValidationErrors,
  ],
  ctrl.updateCampaign
);

router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid campaign ID'),
    handleValidationErrors,
  ],
  ctrl.deleteCampaign
);

router.post(
  '/:id/record-donation',
  [
    param('id').isUUID().withMessage('Invalid campaign ID'),
    body('amount').isNumeric().withMessage('Valid donation amount required'),
    handleValidationErrors,
  ],
  ctrl.recordManualDonation
);

module.exports = router;
