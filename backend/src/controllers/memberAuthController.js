const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../config/logger');

const TOKEN_AUDIENCE = 'member-portal';

const sign = (memberId, churchId) => jwt.sign(
  { memberId, churchId, aud: TOKEN_AUDIENCE },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
);

const isPortalEnabled = (church) => {
  const s = church?.settings || {};
  // Default ON unless explicitly disabled
  return s.member_portal_enabled !== false;
};

// POST /api/member-auth/set-password
// Body: { churchSlug, email, memberNumber, password }
const setPassword = async (req, res) => {
  const { churchSlug, email, memberNumber, password } = req.body;
  if (!churchSlug || !email || !memberNumber || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }
  try {
    const cRes = await query('SELECT id, settings FROM churches WHERE slug = $1 AND is_active = true', [churchSlug]);
    if (!cRes.rows[0]) return res.status(404).json({ success: false, message: 'Church not found' });
    if (!isPortalEnabled(cRes.rows[0])) {
      return res.status(403).json({ success: false, message: 'Member portal is disabled for this church' });
    }
    const churchId = cRes.rows[0].id;

    const mRes = await query(
      `SELECT id FROM members
       WHERE church_id = $1 AND LOWER(email) = LOWER($2) AND member_number = $3
         AND membership_status = 'active'`,
      [churchId, email, memberNumber]
    );
    if (!mRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'No matching active member record found' });
    }

    const hash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE members SET password_hash = $1, portal_invited_at = COALESCE(portal_invited_at, NOW()) WHERE id = $2`,
      [hash, mRes.rows[0].id]
    );
    return res.json({ success: true, message: 'Password set. You can now log in.' });
  } catch (err) {
    logger.error('member setPassword failed', { error: err.message });
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

module.exports = { setPassword, login, TOKEN_AUDIENCE };
