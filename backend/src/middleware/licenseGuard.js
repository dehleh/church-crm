// Blocks API access when a tenant has no active license.
// Super admins and whitelisted churches are always allowed.
// Active = `is_whitelisted=true` OR (`subscription_plan` is set AND
// `subscription_expires_at` is null/future).
//
// Returns HTTP 402 with `code: 'LICENSE_EXPIRED'` so the frontend
// can route the user to a "renew / contact admin" screen.
const requireActiveLicense = (req, res, next) => {
  const u = req.user;
  if (!u) return next(); // unauthenticated routes handled elsewhere
  if (u.is_super_admin) return next();
  if (u.is_whitelisted) return next();

  const plan = u.subscription_plan;
  const exp  = u.subscription_expires_at ? new Date(u.subscription_expires_at) : null;
  const now  = new Date();

  if (plan && (!exp || exp > now)) return next();

  return res.status(402).json({
    success: false,
    code: 'LICENSE_EXPIRED',
    message: plan
      ? 'Your license has expired. Please renew to continue using the product.'
      : 'No active license. Please request a license to continue.',
    data: {
      plan: plan || null,
      expiresAt: u.subscription_expires_at || null,
    },
  });
};

module.exports = { requireActiveLicense };
