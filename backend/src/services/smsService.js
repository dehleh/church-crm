const logger = require('../config/logger');
const https = require('https');

let twilioClient = null;

/**
 * Normalizes phone numbers to international E.164 format.
 * Defaults to Nigeria (+234), handles local 080... format, spaces, hyphens, and brackets.
 */
function normalizePhoneNumber(raw, defaultCountryCode = '+234') {
  if (!raw) return null;
  let cleaned = String(raw).replace(/[^0-9+]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `${defaultCountryCode}${cleaned.slice(1)}`;
  }
  // If only digits without leading 0 or +, prepend default country code
  return `${defaultCountryCode}${cleaned}`;
}

function getTwilioClient(cfg) {
  const sid = cfg?.twilioSid || process.env.TWILIO_SID;
  const token = cfg?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return null;
  }

  try {
    if (!cfg) {
      if (twilioClient) return twilioClient;
      const twilio = require('twilio');
      twilioClient = twilio(sid, token);
      return twilioClient;
    }
    const twilio = require('twilio');
    return twilio(sid, token);
  } catch (err) {
    logger.warn('Twilio package load error', { error: err.message });
    return null;
  }
}

/**
 * Send WhatsApp message using Meta WhatsApp Cloud API directly.
 */
async function sendMetaWhatsAppMessage({ to, body, mediaUrl }, cfg) {
  const token = cfg.whatsappCloudToken || process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneId = cfg.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return false;

  const formattedTo = to.replace(/[^0-9]/g, '');
  const payload = JSON.stringify(
    mediaUrl
      ? {
          messaging_product: 'whatsapp',
          to: formattedTo,
          type: 'image',
          image: { link: mediaUrl, caption: body },
        }
      : {
          messaging_product: 'whatsapp',
          to: formattedTo,
          type: 'text',
          text: { body },
        }
  );

  return new Promise((resolve) => {
    const req = https.request(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (d) => { resData += d; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, response: resData });
          } else {
            logger.warn('Meta WhatsApp API error', { statusCode: res.statusCode, body: resData });
            resolve({ success: false, error: resData });
          }
        });
      }
    );
    req.on('error', (e) => {
      logger.error('Meta WhatsApp request error', { error: e.message });
      resolve({ success: false, error: e.message });
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Send an SMS message.
 * @param {{ to: string | string[], body: string }} options
 * @param {object} [churchSettings] - messaging config from church settings JSONB
 */
async function sendSMS({ to, body }, churchSettings) {
  const cfg = churchSettings?.sms || {};
  const client = getTwilioClient(cfg.twilioSid ? cfg : null);
  const rawNumbers = Array.isArray(to) ? to : [to];
  const numbers = rawNumbers.map(n => normalizePhoneNumber(n)).filter(Boolean);
  const fromPhone = cfg.twilioPhone || process.env.TWILIO_PHONE;

  if (!client || !fromPhone) {
    logger.info('SMS (dry run — service not configured)', { recipientsCount: numbers.length, body: body.substring(0, 80) });
    return { sent: numbers.length, failed: 0, sid: 'dry-run' };
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
 * Send a WhatsApp broadcast or reminder.
 * Supports both Meta WhatsApp Cloud API and Twilio WhatsApp API with automatic phone normalization.
 * @param {{ to: string | string[], body: string, mediaUrl?: string }} options
 * @param {object} [churchSettings] - messaging config from church settings JSONB
 */
async function sendWhatsApp({ to, body, mediaUrl }, churchSettings) {
  const cfg = churchSettings?.whatsapp || churchSettings?.sms || {};
  const rawNumbers = Array.isArray(to) ? to : [to];
  const numbers = rawNumbers.map(n => normalizePhoneNumber(n)).filter(Boolean);

  // Check for Meta WhatsApp Cloud API first
  const hasMeta = (cfg.whatsappCloudToken || process.env.WHATSAPP_CLOUD_TOKEN) &&
                  (cfg.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_ID);

  if (hasMeta) {
    const results = await Promise.allSettled(
      numbers.map(num => sendMetaWhatsAppMessage({ to: num, body, mediaUrl }, cfg))
    );
    const sent = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    const failed = numbers.length - sent;
    logger.info('WhatsApp (Meta Cloud API) batch sent', { sent, failed, total: numbers.length });
    return { sent, failed, provider: 'meta_cloud' };
  }

  // Twilio WhatsApp fallback
  const client = getTwilioClient(cfg.twilioSid ? cfg : null);
  const fromWA = cfg.whatsappNumber || cfg.twilioPhone || process.env.TWILIO_WHATSAPP || process.env.TWILIO_PHONE;

  if (!client || !fromWA) {
    logger.info('WhatsApp (dry run — neither Meta Cloud nor Twilio configured)', {
      recipientsCount: numbers.length,
      sampleRecipients: numbers.slice(0, 3),
      body: body.substring(0, 100),
    });
    return { sent: numbers.length, failed: 0, sid: 'dry-run' };
  }

  const cleanFrom = fromWA.replace('whatsapp:', '');
  const results = await Promise.allSettled(
    numbers.map((number) =>
      client.messages.create({
        body,
        from: `whatsapp:${cleanFrom}`,
        to: `whatsapp:${number}`,
        ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  logger.info('WhatsApp (Twilio) batch sent', { sent, failed, total: numbers.length });

  return { sent, failed, provider: 'twilio' };
}

module.exports = { sendSMS, sendWhatsApp, normalizePhoneNumber };
