const express = require('express');
const router = express.Router();
const c = require('../controllers/mediaController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload, uploadFor } = require('../middleware/upload');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/stats', c.getMediaStats);
router.get('/', c.getMediaItems);
router.post('/', authorize('head_pastor', 'pastor', 'hod'), [
  body('title').notEmpty().trim().escape(),
  body('mediaType').notEmpty().trim(),
], handleValidationErrors, c.createMediaItem);
router.post('/upload', authorize('head_pastor', 'pastor', 'hod'), uploadFor('media'), upload.single('file'), c.uploadMediaFile);
router.patch('/:id/publish', authorize('head_pastor', 'pastor'), c.publishMediaItem);

module.exports = router;
