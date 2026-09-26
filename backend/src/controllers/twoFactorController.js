const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const twoFactorService = require('../services/twoFactorService');
const { logChurchAudit } = require('../services/auditService');
const logger = require('../config/logger');

// Generate standard access & refresh tokens
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

// GET /api/auth/2fa/status
const get2FAStatus = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [req.user.id]
    );
    return res.json({
      success: true,
      data: {
        twoFactorEnabled: Boolean(rows[0]?.two_factor_enabled),
      },
    });
  } catch (err) {
    logger.error('get2FAStatus error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/2fa/setup
const setup2FA = async (req, res) => {
  try {
    const secret = twoFactorService.generateSecret();
    const otpauthUrl = twoFactorService.getOtpAuthUrl({
      secret,
      accountName: req.user.email,
      issuer: 'ChurchOS',
    });
    const qrCode = await twoFactorService.generateQRCode(otpauthUrl);

    // Save temporary secret until verified
    await query(
      'UPDATE users SET two_factor_temp_secret = $1 WHERE id = $2',
      [secret, req.user.id]
    );

    return res.json({
      success: true,
      data: {
        secret,
        qrCode,
        otpauthUrl,
      },
    });
  } catch (err) {
    logger.error('setup2FA error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to initiate 2FA setup' });
  }
};

// POST /api/auth/2fa/enable
const enable2FA = async (req, res) => {
  const { code } = req.body;

  try {
    const { rows } = await query(
      'SELECT two_factor_temp_secret, email FROM users WHERE id = $1',
      [req.user.id]
    );

    const tempSecret = rows[0]?.two_factor_temp_secret;
    if (!tempSecret) {
      return res.status(400).json({ success: false, message: 'Please initiate 2FA setup first' });
    }

    const isValid = twoFactorService.verifyToken(tempSecret, code);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code. Please check your authenticator app.' });
    }

    const backupCodes = twoFactorService.generateBackupCodes(8);

    await query(
      `UPDATE users
       SET two_factor_enabled = true,
           two_factor_secret = two_factor_temp_secret,
           two_factor_temp_secret = NULL,
           two_factor_backup_codes = $1
       WHERE id = $2`,
      [JSON.stringify(backupCodes), req.user.id]
    );

    if (req.user.church_id) {
      logChurchAudit({
        churchId: req.user.church_id,
        actorUserId: req.user.id,
        action: 'security.2fa_enabled',
        resourceType: 'user',
        resourceId: req.user.id,
        details: { email: req.user.email },
        req,
      }).catch(() => {});
    }

    logger.info(`2FA enabled for user ${req.user.email}`);

    return res.json({
      success: true,
      message: 'Two-Factor Authentication enabled successfully!',
      data: {
        backupCodes,
      },
    });
  } catch (err) {
    logger.error('enable2FA error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
};

// POST /api/auth/2fa/disable
const disable2FA = async (req, res) => {
  const { password, code } = req.body;

  try {
    const { rows } = await query(
      'SELECT password_hash, two_factor_secret, two_factor_backup_codes FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password || '', rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const secret = rows[0].two_factor_secret;
    const backupCodes = rows[0].two_factor_backup_codes || [];
    const cleanCode = String(code || '').trim().toUpperCase();

    const isTotpValid = twoFactorService.verifyToken(secret, cleanCode);
    const isBackupValid = backupCodes.includes(cleanCode);

    if (!isTotpValid && !isBackupValid) {
      return res.status(400).json({ success: false, message: 'Invalid 2FA security code' });
    }

    await query(
      `UPDATE users
       SET two_factor_enabled = false,
           two_factor_secret = NULL,
           two_factor_backup_codes = '[]'::jsonb
       WHERE id = $1`,
      [req.user.id]
    );

    if (req.user.church_id) {
      logChurchAudit({
        churchId: req.user.church_id,
        actorUserId: req.user.id,
        action: 'security.2fa_disabled',
        resourceType: 'user',
        resourceId: req.user.id,
        details: { email: req.user.email },
        req,
      }).catch(() => {});
    }

    logger.info(`2FA disabled for user ${req.user.email}`);

    return res.json({
      success: true,
      message: 'Two-Factor Authentication has been disabled.',
    });
  } catch (err) {
    logger.error('disable2FA error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
};

// POST /api/auth/2fa/verify-login
const verify2FALogin = async (req, res) => {
  const { twoFactorToken, code } = req.body;

  try {
    if (!twoFactorToken || !code) {
      return res.status(400).json({ success: false, message: '2FA token and verification code are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(twoFactorToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: '2FA session expired. Please sign in again.' });
    }

    if (!decoded.is2FAPending || !decoded.userId) {
      return res.status(400).json({ success: false, message: 'Invalid 2FA authentication challenge' });
    }

    const { rows } = await query(
      `SELECT u.*,
         c.name as church_name, c.slug as church_slug, c.is_active as church_active,
         c.multi_branch_enabled, c.is_whitelisted, c.subscription_plan, c.subscription_expires_at,
         c.branch_limit, c.member_limit
       FROM users u LEFT JOIN churches c ON c.id = u.church_id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );

    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'User not found or disabled' });
    }

    const user = rows[0];
    const cleanCode = String(code).trim().toUpperCase();
    const backupCodes = user.two_factor_backup_codes || [];

    const isTotpValid = twoFactorService.verifyToken(user.two_factor_secret, cleanCode);
    const backupIdx = backupCodes.indexOf(cleanCode);

    if (!isTotpValid && backupIdx === -1) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA code or backup key' });
    }

    // If backup code used, burn it so it cannot be replayed
    if (backupIdx !== -1) {
      backupCodes.splice(backupIdx, 1);
      await query(
        'UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2',
        [JSON.stringify(backupCodes), user.id]
      );
      logger.info(`User ${user.email} consumed a 2FA backup recovery code (${backupCodes.length} remaining)`);
    }

    // Generate tokens
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
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          isSuperAdmin: user.is_super_admin || false,
          twoFactorEnabled: true,
          churchId: user.church_id,
          churchName: user.church_name,
          churchSlug: user.church_slug,
          avatarUrl: user.avatar_url,
          branchId: user.branch_id,
          subscriptionPlan: user.subscription_plan,
          multiBranchEnabled: user.multi_branch_enabled || false,
          isWhitelisted: user.is_whitelisted || false,
        },
      },
    });
  } catch (err) {
    logger.error('verify2FALogin error:', { error: err.message });
    return res.status(500).json({ success: false, message: '2FA authentication error' });
  }
};

module.exports = {
  get2FAStatus,
  setup2FA,
  enable2FA,
  disable2FA,
  verify2FALogin,
};
