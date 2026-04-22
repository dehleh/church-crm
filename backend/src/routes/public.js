const express = require('express');
const { body } = require('express-validator');
const c = require('../controllers/publicIntakeController');
const { handleValidationErrors } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/churches/:slug/intake', c.getIntakeContext);
router.get('/churches/:slug/events/:eventId/check-in', c.getEventCheckInContext);

router.post('/churches/:slug/first-timers', [
  body('firstName').notEmpty().trim().escape(),
  body('lastName').notEmpty().trim().escape(),
  body('phone').notEmpty().trim(),
  body('email').notEmpty().isEmail().normalizeEmail(),
  body('gender').notEmpty().isIn(['male', 'female']),
  body('visitDate').notEmpty(),
  body('howDidYouHear').notEmpty().trim(),
], handleValidationErrors, c.submitFirstTimer);

router.post('/churches/:slug/members', [
  body('firstName').notEmpty().trim().escape(),
  body('lastName').notEmpty().trim().escape(),
  body('email').notEmpty().isEmail().normalizeEmail(),
  body('phone').notEmpty().trim(),
  body('gender').notEmpty().isIn(['male', 'female']),
  body('dateOfBirth').notEmpty(),
  body('maritalStatus').notEmpty().trim(),
  body('address').notEmpty().trim(),
], handleValidationErrors, c.submitMember);

router.post('/churches/:slug/prayer-requests', [
  body('request').notEmpty().trim(),
  body('category').optional().trim(),
  body('requesterName').optional().trim().escape(),
  body('isAnonymous').optional().isBoolean(),
], handleValidationErrors, c.submitPrayerRequest);

router.post('/churches/:slug/events/:eventId/check-in', [
  body('memberNumber').notEmpty().trim().escape(),
  body('phone').notEmpty().trim(),
], handleValidationErrors, c.submitEventCheckIn);

module.exports = router;