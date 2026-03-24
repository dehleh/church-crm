const logger = require('../config/logger');

let twilioClient = null;

function getClient() {
  if (twilioClient) return twilioClient;

  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    logger.warn('Twilio not configured — SMS will be logged but not sent');
    return null;
  }

  const twilio = require('twilio');
  twilioClient = twilio(sid, token);
  return twilioClient;
}

/**
 * Send an SMS message.
 * @param {{ to: string | string[], body: string }} options
 */
async function sendSMS({ to, body }) {
  const client = getClient();
  const numbers = Array.isArray(to) ? to : [to];

  if (!client) {
    logger.info('SMS (dry run)', { to: numbers, body: body.substring(0, 80) });
    return { sent: numbers.length, sid: 'dry-run' };
  }

  const results = await Promise.allSettled(
    numbers.map((number) =>
      client.messages.create({
        body,
        from: process.env.TWILIO_PHONE,
        to: number,
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  logger.info('SMS batch sent', { sent, failed, total: numbers.length });

  return { sent, failed };
}

module.exports = { sendSMS };
