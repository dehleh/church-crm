const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');
const logger = require('../config/logger');

const generateTokens = (userId, churchId, role) => {
  const accessToken = jwt.sign(
    { userId, churchId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { userId, churchId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register — onboard a new church + super_admin
const registerChurch = async (req, res) => {
  const {
    churchName, churchSlug, denomination,
    adminFirstName, adminLastName, adminEmail, adminPassword, adminPhone
  } = req.body;

  try {
    // Check slug uniqueness
    const slugCheck = await query('SELECT id FROM churches WHERE slug = $1', [churchSlug]);
    if (slugCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Church slug already taken' });
    }

    // Check email uniqueness (global for super_admin registration)
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1', [adminEmail]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const churchId = uuidv4();
    const userId = uuidv4();

    // Run all inserts in a transaction
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create church
      await client.query(
        `INSERT INTO churches (id, name, slug, denomination)
         VALUES ($1, $2, $3, $4)`,
        [churchId, churchName, churchSlug, denomination]
      );

      // Create default HQ branch
      const branchId = uuidv4();
      await client.query(
        `INSERT INTO branches (id, church_id, name, is_headquarters)
         VALUES ($1, $2, $3, true)`,
        [branchId, churchId, `${churchName} HQ`]
      );

      // Create admin user
      await client.query(
        `INSERT INTO users (id, church_id, branch_id, first_name, last_name, email, password_hash, phone, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'super_admin')`,
        [userId, churchId, branchId, adminFirstName, adminLastName, adminEmail, passwordHash, adminPhone]
      );

      // Create default giving categories
      const defaultCategories = ['Tithe', 'Offering', 'Building Fund', 'Welfare', 'Missions'];
      for (const cat of defaultCategories) {
        await client.query(
          `INSERT INTO giving_categories (id, church_id, name) VALUES ($1, $2, $3)`,
          [uuidv4(), churchId, cat]
        );
      }

      const { accessToken, refreshToken } = generateTokens(userId, churchId, 'super_admin');
      await client.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, userId]);

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        message: 'Church registered successfully',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: userId, firstName: adminFirstName, lastName: adminLastName,
            email: adminEmail, role: 'super_admin', churchId, churchName, churchSlug
          }
        }
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Register error', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await query(
      `SELECT u.*, c.name as church_name, c.slug as church_slug, c.is_active as church_active
       FROM users u JOIN churches c ON c.id = u.church_id
       WHERE u.email = $1`,
      [email]
    );

    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }
    if (!user.church_active) {
      return res.status(403).json({ success: false, message: 'Church account suspended' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.church_id, user.role);
    await query(
      'UPDATE users SET refresh_token = $1, last_login_at = NOW() WHERE id = $2',
      [refreshToken, user.id]
    );

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          churchId: user.church_id,
          churchName: user.church_name,
          churchSlug: user.church_slug,
          avatarUrl: user.avatar_url,
          branchId: user.branch_id
        }
      }
    });
  } catch (err) {
    logger.error('Login error', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const { rows } = await query(
      'SELECT * FROM users WHERE id = $1 AND refresh_token = $2 AND is_active = true',
      [decoded.userId, token]
    );
    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    const user = rows[0];
    const tokens = generateTokens(user.id, user.church_id, user.role);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);
    return res.json({ success: true, data: tokens });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const { password_hash, refresh_token, ...user } = req.user;
  return res.json({ success: true, data: user });
};

module.exports = { registerChurch, login, refreshToken, logout, getMe };
