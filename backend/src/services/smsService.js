const logger = require('../config/logger');
const https = require('https');
const http = require('http');
const url = require('url');

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
 * Send SMS via Termii API (Leading African provider for church communications).
 */
async function sendTermiiSMS({ to, body, from, apiKey, channel = 'generic' }) {
  const cleanTo = to.replace(/[^0-9]/g, '');
  const payload = JSON.stringify({
    to: cleanTo,
    from: from || 'ChurchOS',
    sms: body,
    type: 'plain',
    channel: channel || 'generic',
    api_key: apiKey,
  });

  return new Promise((resolve) => {
    const req = https.request(
      'https://api.ng.termii.com/api/sms/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 12000,
      },
      (res) => {
        let resData = '';
        res.on('data', d => { resData += d; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resData);
            if (res.statusCode >= 200 && res.statusCode < 300 && (parsed.message === 'Successfully Sent' || parsed.code === 'ok')) {
              resolve({ success: true, messageId: parsed.message_id || 'termii-sent' });
            } else {
              logger.warn('Termii SMS API warning', { statusCode: res.statusCode, response: resData });
              resolve({ success: false, error: parsed.message || resData });
            }
          } catch {
            resolve({ success: res.statusCode === 200, error: resData });
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(new Error('Termii request timed out after 12000ms')); });
    req.on('error', (e) => {
      logger.error('Termii SMS request error', { error: e.message });
      resolve({ success: false, error: e.message });
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Send SMS or WhatsApp via Custom HTTP REST / Webhook Gateway.
 * Supports any global or local SMS vendor by interpolating {to}, {body}, {sender}, and {apiKey}.
 */
async function sendCustomGateway({ to, body }, cfg) {
  const targetUrl = cfg.customWebhookUrl || cfg.webhookUrl;
  if (!targetUrl) return { success: false, error: 'Custom webhook URL not provided' };

  const cleanTo = to.replace(/[^0-9]/g, '');
  const sender = cfg.senderId || cfg.from || 'ChurchOS';
  const apiKey = cfg.apiKey || '';

  const method = (cfg.httpMethod || 'POST').toUpperCase();
  const parsedUrl = new url.URL(targetUrl);
  const clientLib = parsedUrl.protocol === 'https:' ? https : http;

  let headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'ChurchOS-Messenger/1.0',
  };

  if (cfg.customHeaders) {
    try {
      const customH = typeof cfg.customHeaders === 'string' ? JSON.parse(cfg.customHeaders) : cfg.customHeaders;
      headers = { ...headers, ...customH };
    } catch {}
  }

  let postBody = '';
  if (method === 'POST') {
    if (cfg.bodyTemplate) {
      let rawTpl = typeof cfg.bodyTemplate === 'string' ? cfg.bodyTemplate : JSON.stringify(cfg.bodyTemplate);
      rawTpl = rawTpl
        .replace(/\{to\}/g, cleanTo)
        .replace(/\{body\}/g, JSON.stringify(body).slice(1, -1))
        .replace(/\{message\}/g, JSON.stringify(body).slice(1, -1))
        .replace(/\{sender\}/g, sender)
        .replace(/\{apiKey\}/g, apiKey);
      postBody = rawTpl;
    } else {
      postBody = JSON.stringify({
        to: cleanTo,
        message: body,
        body,
        from: sender,
        sender,
        apiKey,
      });
    }
    headers['Content-Length'] = Buffer.byteLength(postBody);
  }

  return new Promise((resolve) => {
    const req = clientLib.request(
      parsedUrl,
      {
        method,
        headers,
        timeout: 12000,
      },
      (res) => {
        let resData = '';
        res.on('data', d => { resData += d; });
        res.on('end', () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          resolve({ success: ok, response: resData, error: ok ? null : resData });
        });
      }
    );
    req.on('timeout', () => { req.destroy(new Error('Custom gateway request timed out after 12000ms')); });
    req.on('error', (e) => {
      logger.error('Custom gateway request error', { error: e.message });
      resolve({ success: false, error: e.message });
    });
    if (method === 'POST') req.write(postBody);
    req.end();
  });
}

/**
 * Send WhatsApp message using Meta WhatsApp Cloud API directly.
 */
async function sendMetaWhatsAppMessage({ to, body, mediaUrl }, cfg) {
  const token = cfg.metaAccessToken || cfg.whatsappCloudToken || process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneId = cfg.metaPhoneNumberId || cfg.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_ID;
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
        timeout: 10000,
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
    req.on('timeout', () => {
      req.destroy(new Error('Meta WhatsApp request timed out after 10000ms'));
    });
    req.on('error', (e) => {
      logger.error('Meta WhatsApp request error', { error: e.message });
      resolve({ success: false, error: e.message });
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Send an SMS message through Termii, Twilio, or Custom Gateway.
 * @param {{ to: string | string[], body: string }} options
 * @param {object} [churchSettings] - messaging config from church settings JSONB
 */
async function sendSMS(options, churchSettings) {
  const { to, body, message } = options || {};
  const msgBody = String(body ?? message ?? '');
  const effectiveSettings = churchSettings || options?.churchSettings;
  const cfg = effectiveSettings?.messaging?.sms || effectiveSettings?.sms || {};
  const rawNumbers = Array.isArray(to) ? to : [to];
  const numbers = rawNumbers.map(n => normalizePhoneNumber(n)).filter(Boolean);

  const provider = cfg.provider || (cfg.termiiApiKey ? 'termii' : (cfg.twilioSid ? 'twilio' : (cfg.customWebhookUrl ? 'custom' : 'twilio')));

  // ── 1. Termii SMS (Africa & Nigeria Church Standard) ──
  if (provider === 'termii' || cfg.termiiApiKey) {
    const apiKey = cfg.termiiApiKey || process.env.TERMII_API_KEY;
    const sender = cfg.senderId || cfg.termiiSenderId || 'ChurchOS';
    const channel = cfg.termiiChannel || 'generic';

    if (!apiKey) {
      logger.info('Termii SMS (dry run — no API key)', { recipientsCount: numbers.length, body: msgBody.substring(0, 80) });
      return { sent: numbers.length, failed: 0, provider: 'termii', sid: 'dry-run' };
    }

    const results = await Promise.allSettled(
      numbers.map(num => sendTermiiSMS({ to: num, body: msgBody, from: sender, apiKey, channel }))
    );
    const sent = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    const failed = numbers.length - sent;
    logger.info('Termii SMS batch dispatched', { sent, failed, total: numbers.length });
    return { sent, failed, provider: 'termii' };
  }

  // ── 2. Custom Webhook / HTTP REST Gateway (Any Global SMS Vendor) ──
  if (provider === 'custom' || cfg.customWebhookUrl) {
    if (!cfg.customWebhookUrl) {
      logger.info('Custom SMS Gateway (dry run — no URL provided)', { recipientsCount: numbers.length });
      return { sent: numbers.length, failed: 0, provider: 'custom', sid: 'dry-run' };
    }
    const results = await Promise.allSettled(
      numbers.map(num => sendCustomGateway({ to: num, body: msgBody }, cfg))
    );
    const sent = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    const failed = numbers.length - sent;
    logger.info('Custom Gateway SMS batch dispatched', { sent, failed, total: numbers.length });
    return { sent, failed, provider: 'custom' };
  }

  // ── 3. Twilio SMS (Global Standard) ──
  const client = getTwilioClient(cfg.twilioSid ? cfg : null);
  const fromPhone = cfg.twilioPhone || process.env.TWILIO_PHONE;

  if (!client || !fromPhone) {
    logger.info('SMS (dry run — service not configured)', { recipientsCount: numbers.length, body: msgBody.substring(0, 80) });
    return { sent: numbers.length, failed: 0, sid: 'dry-run' };
  }

  const results = await Promise.allSettled(
    numbers.map((number) =>
      client.messages.create({
        body: msgBody,
        from: fromPhone,
        to: number,
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  logger.info('Twilio SMS batch sent', { sent, failed, total: numbers.length });

  return { sent, failed, provider: 'twilio' };
}

/**
 * Send a WhatsApp broadcast or reminder.
 * Supports Meta WhatsApp Cloud API, Twilio WhatsApp, Termii WhatsApp, or Custom Gateway.
 * @param {{ to: string | string[], body: string, message?: string, mediaUrl?: string }} options
 * @param {object} [churchSettings] - messaging config from church settings JSONB
 */
async function sendWhatsApp(options, churchSettings) {
  const { to, body, message, mediaUrl } = options || {};
  const msgBody = String(body ?? message ?? '');
  const effectiveSettings = churchSettings || options?.churchSettings;
  const cfg = effectiveSettings?.messaging?.whatsapp || effectiveSettings?.whatsapp || effectiveSettings?.messaging?.sms || effectiveSettings?.sms || {};
  const rawNumbers = Array.isArray(to) ? to : [to];
  const numbers = rawNumbers.map(n => normalizePhoneNumber(n)).filter(Boolean);

  const provider = cfg.provider || (cfg.metaAccessToken || cfg.whatsappCloudToken ? 'meta' : (cfg.customWebhookUrl ? 'custom' : 'twilio'));

  // ── 1. Meta WhatsApp Cloud API ──
  const hasMeta = (cfg.metaAccessToken || cfg.whatsappCloudToken || process.env.WHATSAPP_CLOUD_TOKEN) &&
                  (cfg.metaPhoneNumberId || cfg.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_ID);

  if (hasMeta && (provider === 'meta' || !cfg.provider)) {
    const results = await Promise.allSettled(
      numbers.map(num => sendMetaWhatsAppMessage({ to: num, body: msgBody, mediaUrl }, cfg))
    );
    const sent = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    const failed = numbers.length - sent;
    logger.info('WhatsApp (Meta Cloud API) batch sent', { sent, failed, total: numbers.length });
    return { sent, failed, provider: 'meta_cloud' };
  }

  // ── 2. Custom WhatsApp Gateway (UltraMsg, GreenAPI, Waboxapp, etc.) ──
  if (provider === 'custom' || cfg.customWebhookUrl) {
    if (!cfg.customWebhookUrl) {
      logger.info('Custom WhatsApp Gateway (dry run — no URL)', { recipientsCount: numbers.length });
      return { sent: numbers.length, failed: 0, provider: 'custom', sid: 'dry-run' };
    }
    const results = await Promise.allSettled(
      numbers.map(num => sendCustomGateway({ to: num, body: msgBody }, cfg))
    );
    const sent = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    const failed = numbers.length - sent;
    logger.info('Custom WhatsApp batch sent', { sent, failed, total: numbers.length });
    return { sent, failed, provider: 'custom' };
  }

  // ── 3. Twilio WhatsApp fallback ──
  const client = getTwilioClient(cfg.twilioSid ? cfg : null);
  const fromWA = cfg.whatsappNumber || cfg.twilioPhone || process.env.TWILIO_WHATSAPP || process.env.TWILIO_PHONE;

  if (!client || !fromWA) {
    logger.info('WhatsApp (dry run — neither Meta Cloud nor Twilio configured)', {
      recipientsCount: numbers.length,
      sampleRecipients: numbers.slice(0, 3),
      body: msgBody.substring(0, 100),
    });
    return { sent: numbers.length, failed: 0, sid: 'dry-run' };
  }

  const cleanFrom = fromWA.replace('whatsapp:', '');
  const results = await Promise.allSettled(
    numbers.map((number) =>
      client.messages.create({
        body: msgBody,
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

module.exports = {
  sendSMS,
  sendWhatsApp,
  normalizePhoneNumber,
  sendTermiiSMS,
  sendCustomGateway,
};
