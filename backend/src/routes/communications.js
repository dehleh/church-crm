const express = require('express');
const router = express.Router();
const c = require('../controllers/communicationsController');
const { authenticate, authorize } = require('../middleware/auth');
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
router.post('/', authorize('super_admin','admin','pastor','staff'), c.createCommunication);

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
router.post('/:id/send', authorize('super_admin','admin','pastor'), c.sendCommunication);

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
router.delete('/:id', authorize('super_admin','admin'), c.deleteCommunication);

module.exports = router;
