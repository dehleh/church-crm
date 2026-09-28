const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subscriptionController');
const { authenticate, authorize } = require('../middleware/auth');

// Public Paystack Webhook (no authentication)
router.post('/webhook', ctrl.handlePaystackWebhook);

router.use(authenticate);

// Current subscription status & available plans (accessible even if expired)
router.get('/current', ctrl.getCurrentSubscription);

// Past subscription payment history
router.get('/history', ctrl.getSubscriptionHistory);

// Initialize payment (admin only)
router.post('/initialize', authorize('admin'), ctrl.initializeSubscription);

// Verify payment & activate plan (admin only)
router.post('/verify', authorize('admin'), ctrl.verifySubscription);

module.exports = router;
