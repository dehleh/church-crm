const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.warn('SMTP not configured — emails will be logged but not sent');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Send an email.
 * @param {{ to: string | string[], subject: string, html: string, text?: string }} options
 */
async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  if (!transport) {
    logger.info('Email (dry run)', { to: recipients, subject });
    return { accepted: [recipients], messageId: 'dry-run' };
  }

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || 'ChurchOS <noreply@churchos.app>',
    to: recipients,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });

  logger.info('Email sent', { messageId: info.messageId, to: recipients, subject });
  return info;
}

module.exports = { sendEmail };
