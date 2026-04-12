const logger = require('../config/logger');

let twilioClient = null;

function getClient(cfg) {
  const sid = cfg?.twilioSid || process.env.TWILIO_SID;
  const token = cfg?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    logger.warn('Twilio not configured — SMS/WhatsApp will be logged but not sent');
    return null;
  }

  // If using env vars, cache the client
  if (!cfg) {
    if (twilioClient) return twilioClient;
    const twilio = require('twilio');
    twilioClient = twilio(sid, token);
    return twilioClient;
  }

  const twilio = require('twilio');
  return twilio(sid, token);
}

/**
 * Send an SMS message.
 * @param {{ to: string | string[], body: string }} options
 * @param {object} [churchSettings] - messaging config from church settings JSONB
 */
async function sendSMS({ to, body }, churchSettings) {
  const cfg = churchSettings?.sms || {};
  const client = getClient(cfg.twilioSid ? cfg : null);
  const numbers = Array.isArray(to) ? to : [to];
  const fromPhone = cfg.twilioPhone || process.env.TWILIO_PHONE;

  if (!client || !fromPhone) {
    logger.info('SMS (dry run)', { to: numbers, body: body.substring(0, 80) });
    return { sent: numbers.length, sid: 'dry-run' };
  }

  const results = await Promise.allSettled(
    numbers.map((number) =>
      client.messages.create({
        body,
        from: fromPhone,
        to: number,
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  logger.info('SMS batch sent', { sent, failed, total: numbers.length });

  return { sent, failed };
}

/**
 * Send a WhatsApp message via Twilio.
 * @param {{ to: string | string[], body: string }} options
 * @param {object} [churchSettings] - messaging config from church settings JSONB
 */
async function sendWhatsApp({ to, body }, churchSettings) {
  const cfg = churchSettings?.whatsapp || churchSettings?.sms || {};
  const client = getClient(cfg.twilioSid ? cfg : null);
  const numbers = Array.isArray(to) ? to : [to];
  const fromWA = cfg.whatsappNumber || cfg.twilioPhone || process.env.TWILIO_WHATSAPP || process.env.TWILIO_PHONE;

  if (!client || !fromWA) {
    logger.info('WhatsApp (dry run)', { to: numbers, body: body.substring(0, 80) });
    return { sent: numbers.length, sid: 'dry-run' };
  }

  const results = await Promise.allSettled(
    numbers.map((number) =>
      client.messages.create({
        body,
        from: `whatsapp:${fromWA}`,
        to: `whatsapp:${number}`,
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  logger.info('WhatsApp batch sent', { sent, failed, total: numbers.length });

  return { sent, failed };
}

module.exports = { sendSMS, sendWhatsApp };
