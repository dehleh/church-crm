const express = require('express');
const router = express.Router();
const c = require('../controllers/mediaController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload, uploadFor } = require('../middleware/upload');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/stats', authorize('admin', 'pastor', 'director', 'hod'), c.getMediaStats);
router.get('/', authorize('admin', 'pastor', 'director', 'hod'), c.getMediaItems);
router.post('/', authorize('admin', 'pastor', 'director', 'hod'), [
  body('title').notEmpty().trim().escape(),
  body('mediaType').notEmpty().trim(),
], handleValidationErrors, c.createMediaItem);
router.post('/upload', authorize('admin', 'pastor', 'director', 'hod'), uploadFor('media'), upload.single('file'), c.uploadMediaFile);
router.patch('/:id/publish', authorize('admin', 'pastor'), c.publishMediaItem);

module.exports = router;
