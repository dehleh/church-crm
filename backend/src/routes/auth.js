const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { body } = require('express-validator');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new church and super admin
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [churchName, churchSlug, adminEmail, adminPassword, adminFirstName, adminLastName]
 *             properties:
 *               churchName: { type: string }
 *               churchSlug: { type: string }
 *               denomination: { type: string }
 *               adminFirstName: { type: string }
 *               adminLastName: { type: string }
 *               adminEmail: { type: string, format: email }
 *               adminPassword: { type: string, minLength: 8 }
 *               adminPhone: { type: string }
 *     responses:
 *       201: { description: Church registered }
 *       409: { description: Slug or email already taken }
 */
router.post('/register', [
  body('churchName').notEmpty().trim(),
  body('churchSlug').notEmpty().trim().toLowerCase().matches(/^[a-z0-9-]+$/),
  body('adminEmail').isEmail().normalizeEmail(),
  body('adminPassword').isLength({ min: 8 }),
  body('adminFirstName').notEmpty().trim(),
  body('adminLastName').notEmpty().trim(),
], auth.registerChurch);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], auth.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New tokens issued }
 */
router.post('/refresh', auth.refreshToken);

const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current user
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authenticate, auth.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     responses:
 *       200: { description: User profile }
 */
router.get('/me', authenticate, auth.getMe);

module.exports = router;
