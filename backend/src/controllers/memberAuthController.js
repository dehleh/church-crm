const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../config/logger');
const { sendEmail } = require('../services/emailService');
const { sendWhatsApp, sendSMS } = require('../services/smsService');

const TOKEN_AUDIENCE = 'member-portal';

const sign = (memberId, churchId) => jwt.sign(
  { memberId, churchId, aud: TOKEN_AUDIENCE },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
);

const isPortalEnabled = (church) => {
  const s = church?.settings || {};
  return s.member_portal_enabled !== false;
};

// POST /api/member-auth/set-password
// Body: { churchSlug, email, password, token?, memberNumber? }
const setPassword = async (req, res) => {
  const { churchSlug, email, password, token, memberNumber } = req.body;
  if (!churchSlug || !email || !password) {
    return res.status(400).json({ success: false, message: 'Church, email, and password are required' });
  }
  if (!token && !memberNumber) {
    return res.status(400).json({ success: false, message: 'Verification token or Member Number is required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }
  try {
    const cRes = await query('SELECT id, name, settings FROM churches WHERE slug = $1 AND is_active = true', [churchSlug]);
    if (!cRes.rows[0]) return res.status(404).json({ success: false, message: 'Church not found' });
    if (!isPortalEnabled(cRes.rows[0])) {
      return res.status(403).json({ success: false, message: 'Member portal is disabled for this church' });
    }
    const churchId = cRes.rows[0].id;

    let member = null;

    // 1. Verify by token if provided (1-click link from onboarding or reset)
    if (token) {
      const tRes = await query(
        `SELECT id, first_name, last_name, email, member_number, membership_status
         FROM members
         WHERE church_id = $1 AND LOWER(email) = LOWER($2) AND set_password_token = $3
           AND (set_password_expires_at IS NULL OR set_password_expires_at > NOW())`,
        [churchId, email, token.trim()]
      );
      member = tRes.rows[0];
      if (!member) {
        return res.status(400).json({
          success: false,
          message: 'The password setup link is invalid or has expired. Please request a new link.'
        });
      }
    } else if (memberNumber) {
      // 2. Verify by Member Number
      const mRes = await query(
        `SELECT id, first_name, last_name, email, member_number, membership_status
         FROM members
         WHERE church_id = $1 AND LOWER(email) = LOWER($2) AND UPPER(member_number) = UPPER($3)
           AND membership_status != 'inactive'`,
        [churchId, email, memberNumber.trim()]
      );
      member = mRes.rows[0];
      if (!member) {
        return res.status(404).json({ success: false, message: 'No matching member record found for this email and member number' });
      }
    }

    const hash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE members
       SET password_hash = $1,
           portal_invited_at = COALESCE(portal_invited_at, NOW()),
           membership_status = 'active',
           set_password_token = NULL,
           set_password_expires_at = NULL,
           portal_last_login_at = NOW()
       WHERE id = $2`,
      [hash, member.id]
    );

    const authToken = sign(member.id, churchId);
    return res.json({
      success: true,
      message: 'Password created successfully! You are now logged in.',
      data: { token: authToken, churchSlug }
    });
  } catch (err) {
    logger.error('member setPassword failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/member-auth/forgot-password
// Body: { churchSlug, email }
const forgotPassword = async (req, res) => {
  const { churchSlug, email } = req.body;
  if (!churchSlug || !email) {
    return res.status(400).json({ success: false, message: 'Church and email are required' });
  }
  try {
    const cRes = await query('SELECT id, name, slug, settings FROM churches WHERE slug = $1 AND is_active = true', [churchSlug]);
    const church = cRes.rows[0];
    if (!church || !isPortalEnabled(church)) {
      return res.json({ success: true, message: 'If an account exists with that email, a password reset link has been dispatched.' });
    }

    const mRes = await query(
      `SELECT id, first_name, last_name, email, phone, member_number FROM members
       WHERE church_id = $1 AND LOWER(email) = LOWER($2) AND membership_status != 'inactive'`,
      [church.id, email.trim()]
    );
    const member = mRes.rows[0];

    if (member) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await query(
        `UPDATE members
         SET set_password_token = $1, set_password_expires_at = NOW() + INTERVAL '24 hours'
         WHERE id = $2`,
        [resetToken, member.id]
      );

      const origin = req.headers.origin || (req.headers.host ? `${req.secure ? 'https' : 'http'}://${req.headers.host}` : null);
      const baseUrl = (origin && !origin.includes(':5000'))
        ? origin
        : (process.env.FRONTEND_URL || process.env.APP_URL || 'https://cos.themobilemissionary.org');

      const resetUrl = `${baseUrl}/portal/${church.slug}/set-password?token=${resetToken}&email=${encodeURIComponent(member.email)}`;
      const churchSettings = church.settings?.messaging || {};

      if (member.email) {
        sendEmail({
          to: member.email,
          subject: `Reset your Member Portal Password — ${church.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px;">
              <h2 style="color: #065f46; margin-top: 0;">Password Reset Request</h2>
              <p>Hello <strong>${member.first_name}</strong>,</p>
              <p>We received a request to set or reset your password for the <strong>${church.name}</strong> Member Portal (Member ID: ${member.member_number}).</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetUrl}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Set New Password
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b;">This link is valid for 24 hours. If you did not make this request, you can safely ignore this message.</p>
            </div>
          `,
        }, churchSettings).catch(err => logger.warn('Reset email failed', { error: err.message }));
      }

      if (member.phone) {
        sendWhatsApp({
          to: member.phone,
          body: `Hello *${member.first_name}*, here is your secure link to create or reset your password for the *${church.name}* Member Portal:\n${resetUrl}\n(Valid for 24 hours).`
        }, churchSettings).catch(() => {});
      }
    }

    return res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been dispatched.'
    });
  } catch (err) {
    logger.error('member forgotPassword failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/member-auth/login
// Body: { churchSlug, email, password }
const login = async (req, res) => {
  const { churchSlug, email, password } = req.body;
  if (!churchSlug || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  try {
    const cRes = await query('SELECT id, settings FROM churches WHERE slug = $1 AND is_active = true', [churchSlug]);
    if (!cRes.rows[0]) return res.status(404).json({ success: false, message: 'Church not found' });
    if (!isPortalEnabled(cRes.rows[0])) {
      return res.status(403).json({ success: false, message: 'Member portal is disabled for this church' });
    }
    const churchId = cRes.rows[0].id;

    const mRes = await query(
      `SELECT id, password_hash, membership_status FROM members
       WHERE church_id = $1 AND LOWER(email) = LOWER($2)`,
      [churchId, email]
    );
    const m = mRes.rows[0];
    if (!m || !m.password_hash) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (m.membership_status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your membership is not active' });
    }
    const ok = await bcrypt.compare(password, m.password_hash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    await query('UPDATE members SET portal_last_login_at = NOW() WHERE id = $1', [m.id]);
    const token = sign(m.id, churchId);
    return res.json({ success: true, data: { token, churchSlug } });
  } catch (err) {
    logger.error('member login failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { setPassword, forgotPassword, login, TOKEN_AUDIENCE };

