const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      `SELECT u.*, c.name as church_name, c.slug as church_slug, c.is_active as church_active
       FROM users u
       JOIN churches c ON c.id = u.church_id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );

    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    if (!rows[0].church_active) {
      return res.status(403).json({ success: false, message: 'Church account is suspended' });
    }

    req.user = rows[0];
    req.churchId = rows[0].church_id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`
      });
    }
    next();
  };
};

// Ensure user can only access their own church's data
const tenantGuard = (req, res, next) => {
  if (req.params.churchId && req.params.churchId !== req.churchId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

module.exports = { authenticate, authorize, tenantGuard };
