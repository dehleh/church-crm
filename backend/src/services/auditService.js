const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * Log a sensitive church action to the immutable church_audit_logs table
 */
async function logChurchAudit({
  churchId,
  actorUserId = null,
  actorName = null,
  actorEmail = null,
  action,
  resourceType,
  resourceId = null,
  details = {},
  req = null,
}) {
  try {
    let ipAddress = null;
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      if (!actorUserId && req.user) {
        actorUserId = req.user.id;
        actorName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.name;
        actorEmail = req.user.email;
      }
    }

    await query(
      `INSERT INTO church_audit_logs (
        church_id, actor_user_id, actor_name, actor_email,
        action, resource_type, resource_id, ip_address, details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        churchId,
        actorUserId,
        actorName,
        actorEmail,
        action,
        resourceType,
        resourceId,
        ipAddress,
        JSON.stringify(details || {}),
      ]
    );
  } catch (err) {
    logger.warn('Failed to record church audit log:', { error: err.message, action });
  }
}

module.exports = { logChurchAudit };
