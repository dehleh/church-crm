const express = require('express');
const router = express.Router();
const c = require('../controllers/communicationsController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
router.use(authenticate);

/**
 * @swagger
 * /communications/stats:
 *   get:
 *     tags: [Communications]
 *     summary: Communication statistics
 *     responses:
 *       200: { description: Stats }
 */
router.get('/stats', c.getCommStats);

/**
 * @swagger
 * /communications:
 *   get:
 *     tags: [Communications]
 *     summary: List communications
 *     parameters:
 *       - { in: query, name: channel, schema: { type: string, enum: [email, sms, whatsapp, push, in_app] } }
 *       - { in: query, name: status, schema: { type: string, enum: [draft, scheduled, sent, failed] } }
 *     responses:
 *       200: { description: Communications list }
 *   post:
 *     tags: [Communications]
 *     summary: Compose a new message (saved as draft)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body, channel]
 *             properties:
 *               title: { type: string }
 *               body: { type: string }
 *               channel: { type: string, enum: [email, sms, whatsapp, push, in_app] }
 *               audience: { type: string, enum: [all, members, department, branch, custom] }
 *     responses:
 *       201: { description: Draft created }
 */
router.get('/', c.getCommunications);
router.post('/', authorize('head_pastor','pastor','director','hod'), [
  body('title').notEmpty().trim().escape(),
  body('body').notEmpty(),
  body('channel').notEmpty().isIn(['email', 'sms', 'whatsapp', 'push', 'in_app']),
  body('audience').optional().isIn(['all', 'members', 'department', 'branch', 'custom']),
], handleValidationErrors, c.createCommunication);

/**
 * @swagger
 * /communications/{id}/send:
 *   post:
 *     tags: [Communications]
 *     summary: Send a drafted communication
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Message sent }
 */
router.post('/:id/send', authorize('head_pastor','pastor','director'), c.sendCommunication);

/**
 * @swagger
 * /communications/{id}:
 *   delete:
 *     tags: [Communications]
 *     summary: Delete a draft communication
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Draft deleted }
 */
router.delete('/:id', authorize('head_pastor','pastor'), c.deleteCommunication);

module.exports = router;
