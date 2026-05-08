const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const TOKEN_AUDIENCE = 'member-portal';

const authenticateMember = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.aud !== TOKEN_AUDIENCE || !decoded.memberId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    const { rows } = await query(
      `SELECT m.*, c.name as church_name, c.slug as church_slug, c.settings as church_settings
       FROM members m JOIN churches c ON c.id = m.church_id
       WHERE m.id = $1 AND c.is_active = true`,
      [decoded.memberId]
    );
    const m = rows[0];
    if (!m || m.membership_status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account inactive' });
    }
    if (m.church_settings && m.church_settings.member_portal_enabled === false) {
      return res.status(403).json({ success: false, message: 'Member portal disabled' });
    }
    req.member = m;
    req.churchId = m.church_id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { authenticateMember };
