const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * Checks and records webhook events atomically to ensure idempotency.
 * Returns true if the webhook is new and should be processed.
 * Returns false if the webhook was already processed (duplicate/replay).
 *
 * @param {object} clientOrPool - pg client or db pool
 * @param {{ provider: string, eventId: string, rawPayload?: string|Buffer }} param1
 * @returns {Promise<boolean>}
 */
async function recordWebhookIfNew(clientOrPool, { provider, eventId, rawPayload }) {
  if (!provider || !eventId) return true;

  const runner = clientOrPool || { query };
  const payloadHash = rawPayload
    ? crypto.createHash('sha256').update(rawPayload).digest('hex')
    : null;

  try {
    const res = await runner.query(
      `INSERT INTO processed_webhooks (provider, event_id, payload_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING id`,
      [String(provider).toLowerCase().trim(), String(eventId).trim(), payloadHash]
    );

    // If no row was inserted, the event was already received and processed
    return res.rows.length > 0;
  } catch (err) {
    logger.warn('Webhook idempotency check error (falling back to processing):', {
      provider,
      eventId,
      error: err.message,
    });
    return true;
  }
}

module.exports = { recordWebhookIfNew };

