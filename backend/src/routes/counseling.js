const express = require('express');
const router = express.Router();
const c = require('../controllers/counselingController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/stats', c.getCounselingStats);
router.get('/', c.getCounselingSessions);
router.post('/', [
  body('sessionType').optional().isIn(['general', 'marital', 'spiritual', 'family', 'grief', 'career', 'other']),
  body('notes').optional().trim(),
], handleValidationErrors, c.createCounselingSession);
router.patch('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('status').optional().isIn(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']),
], handleValidationErrors, c.updateCounselingSession);

module.exports = router;
