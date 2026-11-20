const nodemailer = require('nodemailer');
const https = require('https');
const logger = require('../config/logger');

let smtpTransporter = null;

function getSmtpTransporter(cfg) {
  const host = cfg?.smtpHost || process.env.SMTP_HOST;
  const user = cfg?.smtpUser || process.env.SMTP_USER;
  const pass = cfg?.smtpPass || process.env.SMTP_PASS;
  const port = parseInt(cfg?.smtpPort || process.env.SMTP_PORT || '587', 10);
  const secure = cfg?.smtpSecure !== undefined ? Boolean(cfg.smtpSecure) : (port === 465);

  if (!host || !user) return null;

  const transportOptions = {
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false, // Prevents failures with private church mail servers or self-signed certs
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  };

  // If using env vars, cache the transporter
  if (!cfg) {
    if (smtpTransporter) return smtpTransporter;
    smtpTransporter = nodemailer.createTransport(transportOptions);
    return smtpTransporter;
  }

  // Per-church config — create fresh transporter
  return nodemailer.createTransport(transportOptions);
}

/**
 * Send email via Resend API directly.
 */
async function sendResendEmail({ from, to, subject, html, text }, apiKey) {
  const payload = JSON.stringify({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 12000,
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ accepted: to, messageId: parsed.id || 'resend' });
            } else {
              reject(new Error(parsed.message || data || `Resend failed with status ${res.statusCode}`));
            }
          } catch {
            reject(new Error(`Resend API response error (${res.statusCode}): ${data}`));
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(new Error('Resend request timed out after 12000ms')); });
    req.on('error', err => { reject(err); });
    req.write(payload);
    req.end();
  });
}

/**
 * Send an email via custom SMTP, SendGrid, Resend, or fallback.
 * @param {{ to: string | string[], subject: string, html: string, text?: string }} options
 * @param {object} [churchSettings] - messaging config from church settings JSONB
 */
async function sendEmail({ to, subject, html, text }, churchSettings) {
  const cfg = churchSettings?.messaging?.email || churchSettings?.email || {};
  const provider = cfg.provider || (cfg.sendgridApiKey || process.env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp');
  const fromEmail = cfg.fromEmail || process.env.SMTP_FROM || 'noreply@themobilemissionary.org';
  const fromName = cfg.fromName || 'ChurchOS';
  const formattedFrom = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  const recipients = Array.isArray(to) ? to : [to];

  // ── 1. Resend API ──
  if (provider === 'resend') {
    const apiKey = cfg.resendApiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.info('Resend (dry run — no API key)', { to: recipients, subject });
      return { accepted: recipients, messageId: 'dry-run' };
    }
    const res = await sendResendEmail(
      { from: formattedFrom, to: recipients, subject, html, text },
      apiKey
    );
    logger.info('Email sent via Resend', { to: recipients.length, subject, messageId: res.messageId });
    return res;
  }

  // ── 2. SendGrid API ──
  if (provider === 'sendgrid') {
    const apiKey = cfg.sendgridApiKey || process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.info('SendGrid (dry run — no API key)', { to: recipients, subject });
      return { accepted: recipients, messageId: 'dry-run' };
    }
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(apiKey);
    const msg = {
      to: recipients,
      from: formattedFrom,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    };
    try {
      const [response] = await sgMail.send(msg, recipients.length > 1);
      logger.info('Email sent via SendGrid', { statusCode: response.statusCode, to: recipients.length, subject });
      return { accepted: recipients, messageId: response.headers?.['x-message-id'] || 'sendgrid' };
    } catch (err) {
      logger.error('SendGrid error', { error: err.message });
      throw err;
    }
  }

  // ── 3. Custom / Standard SMTP (nodemailer) ──
  const transport = getSmtpTransporter(cfg.provider === 'smtp' ? cfg : null);
  if (!transport) {
    logger.info('Email (dry run — SMTP not configured)', { to: recipients.join(', '), subject });
    return { accepted: recipients, messageId: 'dry-run' };
  }

  try {
    const info = await transport.sendMail({
      from: formattedFrom,
      to: recipients.join(', '),
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });

    logger.info('Email sent via SMTP', { messageId: info.messageId, to: recipients.length, subject });
    return info;
  } catch (err) {
    logger.error('SMTP send error', { error: err.message, host: cfg.smtpHost });
    throw err;
  }
}

module.exports = { sendEmail, getSmtpTransporter };
