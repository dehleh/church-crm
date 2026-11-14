const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { authenticateMember } = require('../middleware/memberAuth');
const ctrl = require('../controllers/pledgeController');

// ── Member Portal Routes ──────────────────────────────────────
router.get('/my', authenticateMember, ctrl.getMyPledges);
router.post('/portal', authenticateMember, ctrl.createPledge);

// ── Church Staff Routes ───────────────────────────────────────
router.get('/', authenticate, authorize('admin', 'pastor', 'finance'), ctrl.getCampaignPledges);
router.post('/', authenticate, authorize('admin', 'pastor', 'finance'), ctrl.createPledge);
router.post('/:id/fulfill', authenticate, authorize('admin', 'pastor', 'finance'), ctrl.fulfillPledge);

module.exports = router;
