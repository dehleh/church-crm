const express = require('express');
const router = express.Router();
const c = require('../controllers/membersController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

/**
 * @swagger
 * /members/stats:
 *   get:
 *     tags: [Members]
 *     summary: Get member statistics
 *     responses:
 *       200: { description: Member stats }
 */
router.get('/stats', c.getMemberStats);

/**
 * @swagger
 * /members:
 *   get:
 *     tags: [Members]
 *     summary: List members with pagination & filters
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, inactive, transferred, deceased] } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Paginated member list
 *   post:
 *     tags: [Members]
 *     summary: Create a new member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               gender: { type: string, enum: [male, female] }
 *               branchId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Member created }
 */
router.get('/', c.getMembers);
router.post('/', authorize('super_admin', 'admin', 'pastor', 'staff'), c.createMember);

/**
 * @swagger
 * /members/{id}:
 *   get:
 *     tags: [Members]
 *     summary: Get a single member
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Member details }
 *       404: { description: Not found }
 *   put:
 *     tags: [Members]
 *     summary: Update a member
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Member updated }
 *   delete:
 *     tags: [Members]
 *     summary: Deactivate a member (soft delete)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Member deactivated }
 */
router.get('/:id', c.getMember);
router.put('/:id', authorize('super_admin', 'admin', 'pastor', 'staff'), c.updateMember);
router.delete('/:id', authorize('super_admin', 'admin'), c.deleteMember);

module.exports = router;
