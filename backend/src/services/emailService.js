const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const logger = require('../config/logger');

let smtpTransporter = null;

function getSmtpTransporter(cfg) {
  const host = cfg?.smtpHost || process.env.SMTP_HOST;
  const user = cfg?.smtpUser || process.env.SMTP_USER;
  const pass = cfg?.smtpPass || process.env.SMTP_PASS;
  const port = cfg?.smtpPort || process.env.SMTP_PORT || '587';

  if (!host || !user) return null;

  // If using env vars, cache the transporter
  if (!cfg) {
    if (smtpTransporter) return smtpTransporter;
    smtpTransporter = nodemailer.createTransport({
      host, port: parseInt(port, 10), secure: port === '465',
      auth: { user, pass },
    });
    return smtpTransporter;
  }

  // Per-church config — create fresh transporter
  return nodemailer.createTransport({
    host, port: parseInt(port, 10), secure: port === '465',
    auth: { user, pass },
  });
}

/**
 * Send an email via SMTP or SendGrid.
 * @param {{ to: string | string[], subject: string, html: string, text?: string }} options
 * @param {object} [churchSettings] - messaging config from church settings JSONB
 */
async function sendEmail({ to, subject, html, text }, churchSettings) {
  const cfg = churchSettings?.email || {};
  const provider = cfg.provider || (process.env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp');
  const fromEmail = cfg.fromEmail || process.env.SMTP_FROM || 'ChurchOS <noreply@churchos.app>';
  const recipients = Array.isArray(to) ? to : [to];

  // ── SendGrid ──
  if (provider === 'sendgrid') {
    const apiKey = cfg.sendgridApiKey || process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.info('SendGrid (dry run — no API key)', { to: recipients, subject });
      return { accepted: recipients, messageId: 'dry-run' };
    }
    sgMail.setApiKey(apiKey);
    const msg = {
      to: recipients,
      from: fromEmail,
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

  // ── SMTP (nodemailer) ──
  const transport = getSmtpTransporter(cfg.provider === 'smtp' ? cfg : null);
  if (!transport) {
    logger.info('Email (dry run — SMTP not configured)', { to: recipients.join(', '), subject });
    return { accepted: recipients, messageId: 'dry-run' };
  }

  const info = await transport.sendMail({
    from: fromEmail,
    to: recipients.join(', '),
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });

  logger.info('Email sent via SMTP', { messageId: info.messageId, to: recipients.length, subject });
  return info;
}

module.exports = { sendEmail };
