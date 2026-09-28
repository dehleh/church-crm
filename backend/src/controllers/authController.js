const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');
const logger = require('../config/logger');
const { sendEmail } = require('../services/emailService');

const generateTokens = (userId, churchId, role) => {
  const accessToken = jwt.sign(
    { userId, churchId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, churchId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register — onboard a new church + head_pastor
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

    // Check email uniqueness (global for head_pastor registration)
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

      // Single-branch vs Multi-branch trial setup
      const isMultiBranch = Boolean(
        req.body.multiBranch === true ||
        req.body.multiBranch === 'true' ||
        req.body.churchType === 'multi' ||
        req.body.plan === 'growth'
      );
      const branchLimit = isMultiBranch ? 3 : 1;

      // Create church (auto-grant 14-day free trial)
      const trialExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await client.query(
        `INSERT INTO churches (id, name, slug, denomination, subscription_plan, subscription_expires_at, multi_branch_enabled, branch_limit)
         VALUES ($1, $2, $3, $4, 'trial', $5, $6, $7)`,
        [churchId, churchName, churchSlug, denomination, trialExpires, isMultiBranch, branchLimit]
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'head_pastor')`,
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

      const { accessToken, refreshToken } = generateTokens(userId, churchId, 'head_pastor');
      await client.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, userId]);

      await client.query('COMMIT');

      // Dispatch welcome email asynchronously
      sendEmail({
        to: adminEmail,
        subject: `Welcome to ChurchOS — Let's get ${churchName} started!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="margin-bottom: 20px;">
              <span style="font-size: 22px; font-weight: bold; color: #4338ca;">⛪ ChurchOS</span>
            </div>
            <h2 style="color: #111827; margin-top: 0;">Welcome, ${adminFirstName}!</h2>
            <p>Thank you for choosing ChurchOS for <strong>${churchName}</strong>. Your 14-day free trial has been activated with full access to all features.</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #1e3a8a;">4 Quick Steps to Get Started:</h4>
              <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151; line-height: 1.8;">
                <li><strong>Add Members:</strong> Enter congregation members or bulk import via CSV.</li>
                <li><strong>Schedule Services:</strong> Set up your Sunday service and mid-week fellowships.</li>
                <li><strong>Track Giving:</strong> Record tithes, offerings, and donations.</li>
                <li><strong>Invite Team:</strong> Add branch pastors and administrators to collaborate.</li>
              </ol>
            </div>

            <p style="font-size: 13px; color: #4b5563;">
              Your trial mode: <strong>${isMultiBranch ? 'Multi-Branch (Growth)' : 'Single-Branch (Starter)'}</strong>.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://cos.themobilemissionary.org'}/dashboard" style="background: #4338ca; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Access Church Dashboard →
              </a>
            </div>
            <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px;">
              Need any assistance? Reply to this email or contact hello@themobilemissionary.org.
            </p>
          </div>
        `,
      }).catch(err => logger.warn('Failed to send welcome email', { error: err.message }));

      return res.status(201).json({
        success: true,
        message: 'Church registered successfully',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: userId, firstName: adminFirstName, lastName: adminLastName,
            email: adminEmail, role: 'head_pastor', churchId, churchName, churchSlug,
            subscriptionPlan: 'trial',
            subscriptionExpiresAt: trialExpires.toISOString(),
            multiBranchEnabled: isMultiBranch,
            branchLimit: branchLimit,
            isWhitelisted: false,
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
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    let { rows } = await query(
      `SELECT u.*,
         c.name as church_name, c.slug as church_slug, c.is_active as church_active,
         c.multi_branch_enabled, c.is_whitelisted, c.subscription_plan, c.subscription_expires_at,
         c.branch_limit, c.member_limit
       FROM users u LEFT JOIN churches c ON c.id = u.church_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [(email || '').trim()]
    );

    const platformAdminEmail = (process.env.PLATFORM_ADMIN_EMAIL || 'superadmin@churchos.platform').toLowerCase().trim();
    if (!rows[0] && (email || '').toLowerCase().trim() === platformAdminEmail) {
      logger.info('Platform Super Admin user missing during login attempt — auto-recovering now...', { email });
      const { ensureSuperAdmin } = require('../scripts/initSuperAdmin');
      await ensureSuperAdmin();
      const retry = await query(
        `SELECT u.*,
           c.name as church_name, c.slug as church_slug, c.is_active as church_active,
           c.multi_branch_enabled, c.is_whitelisted, c.subscription_plan, c.subscription_expires_at,
           c.branch_limit, c.member_limit
         FROM users u LEFT JOIN churches c ON c.id = u.church_id
         WHERE LOWER(u.email) = LOWER($1)`,
        [(email || '').trim()]
      );
      rows = retry.rows;
    }

    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }
    if (user.church_id && !user.church_active && !user.is_super_admin) {
      return res.status(403).json({ success: false, message: 'Church account suspended' });
    }

    // Check account lockout
    const failedAttempts = user.failed_login_attempts || 0;
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS && user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (lockedUntil > new Date()) {
        const minutes = Math.ceil((lockedUntil - new Date()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account locked due to too many failed attempts. Try again in ${minutes} minutes.`
        });
      }
      // Lockout expired — reset
      await query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const newAttempts = failedAttempts + 1;
      const lockUntil = newAttempts >= MAX_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;
      await query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [newAttempts, lockUntil, user.id]
      );
      logger.warn('Failed login attempt', { email, attempts: newAttempts });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if 2FA is enabled on user account
    if (user.two_factor_enabled) {
      const twoFactorToken = jwt.sign(
        { userId: user.id, is2FAPending: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        success: true,
        requireTwoFactor: true,
        twoFactorToken,
        message: 'Two-factor authentication required. Please enter your 6-digit code.',
      });
    }

    // Successful login — reset failed attempts
    const { accessToken, refreshToken } = generateTokens(user.id, user.church_id, user.role);
    await query(
      `UPDATE users SET refresh_token = $1, last_login_at = NOW(),
       failed_login_attempts = 0, locked_until = NULL WHERE id = $2`,
      [refreshToken, user.id]
    );

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        forcePasswordChange: user.force_password_change || false,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          isSuperAdmin: user.is_super_admin || false,
          twoFactorEnabled: Boolean(user.two_factor_enabled),
          churchId: user.church_id,
          churchName: user.church_name,
          churchSlug: user.church_slug,
          avatarUrl: user.avatar_url,
          branchId: user.branch_id,
          multiBranchEnabled: user.multi_branch_enabled || false,
          isWhitelisted: user.is_whitelisted || false,
          subscriptionPlan: user.subscription_plan || null,
          subscriptionExpiresAt: user.subscription_expires_at || null,
          branchLimit: user.branch_limit ?? null,
          memberLimit: user.member_limit ?? null,
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
  const { password_hash, refresh_token, ...u } = req.user;
  // Normalize church flags to camelCase (frontend convention)
  const data = {
    ...u,
    isSuperAdmin: u.is_super_admin || false,
    twoFactorEnabled: Boolean(u.two_factor_enabled),
    churchId: u.church_id,
    churchName: u.church_name,
    churchSlug: u.church_slug,
    branchId: u.branch_id,
    avatarUrl: u.avatar_url,
    firstName: u.first_name,
    lastName: u.last_name,
    multiBranchEnabled: u.multi_branch_enabled || false,
    isWhitelisted: u.is_whitelisted || false,
    subscriptionPlan: u.subscription_plan || null,
    subscriptionExpiresAt: u.subscription_expires_at || null,
    branchLimit: u.branch_limit ?? null,
    memberLimit: u.member_limit ?? null,
  };
  return res.json({ success: true, data });
};

module.exports = { registerChurch, login, refreshToken, logout, getMe };
