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
      `SELECT u.*,
         c.name as church_name, c.slug as church_slug, c.is_active as church_active,
         c.multi_branch_enabled, c.is_whitelisted, c.subscription_plan, c.subscription_expires_at,
         c.branch_limit, c.member_limit
       FROM users u
       JOIN churches c ON c.id = u.church_id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );

    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    // Super admins bypass church-suspended check (they manage tenants)
    if (!rows[0].church_active && !rows[0].is_super_admin) {
      return res.status(403).json({ success: false, message: 'Church account is suspended' });
    }

    req.user = rows[0];
    req.churchId = rows[0].church_id;

    // License enforcement — block product use if no active license.
    // Exempt paths: auth, license intake, platform admin, public, contact,
    // member portal/auth, and self info endpoint.
    const LICENSE_EXEMPT = ['/api/auth', '/api/license', '/api/platform',
      '/api/public', '/api/contact', '/api/me', '/api/member-auth'];
    const path = req.originalUrl || '';
    const exempt = LICENSE_EXEMPT.some(p => path.startsWith(p));
    if (!exempt && !rows[0].is_super_admin && !rows[0].is_whitelisted) {
      const plan = rows[0].subscription_plan;
      const exp  = rows[0].subscription_expires_at ? new Date(rows[0].subscription_expires_at) : null;
      const valid = plan && (!exp || exp > new Date());
      if (!valid) {
        return res.status(402).json({
          success: false,
          code: 'LICENSE_EXPIRED',
          message: plan
            ? 'Your license has expired. Please renew to continue using the product.'
            : 'No active license. Please request a license to continue.',
          data: { plan: plan || null, expiresAt: rows[0].subscription_expires_at || null },
        });
      }
    }

    // Branch context: explicit query param overrides; branch-scoped roles are pinned.
    const q = req.query || {};
    const branchScopedRoles = ['branch_admin', 'branch_pastor'];
    if (branchScopedRoles.includes(rows[0].role)) {
      req.branchId = rows[0].branch_id || null;
      if (q.branchId && q.branchId !== req.branchId) {
        return res.status(403).json({ success: false, message: 'Branch scope violation' });
      }
    } else {
      req.branchId = q.branchId || null;
    }
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
    if (req.user?.is_super_admin) return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`
      });
    }
    next();
  };
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.is_super_admin) {
    return res.status(403).json({ success: false, message: 'Super admin only' });
  }
  next();
};

// Ensure user can only access their own church's data
const tenantGuard = (req, res, next) => {
  if (req.user?.is_super_admin) return next();
  if (req.params.churchId && req.params.churchId !== req.churchId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

module.exports = { authenticate, authorize, requireSuperAdmin, tenantGuard };
