const { query } = require('../config/database');
const logger = require('../config/logger');

let mailer = null;
function getMailer() {
  if (mailer) return mailer;
  if (!process.env.SMTP_HOST) return null;
  try {
    const nodemailer = require('nodemailer');
    mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    return mailer;
  } catch (e) {
    logger.warn('nodemailer not installed; contact emails disabled');
    return null;
  }
}

async function notify(submission) {
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  if (!to) return;
  const m = getMailer();
  if (!m) return;
  try {
    await m.sendMail({
      from: process.env.SMTP_FROM || `ChurchOS <no-reply@churchos.app>`,
      to,
      subject: `New ChurchOS lead: ${submission.name}${submission.church ? ' — ' + submission.church : ''}`,
      text: `Name: ${submission.name}\nEmail: ${submission.email}\nChurch: ${submission.church || '-'}\n\nMessage:\n${submission.message}\n\nSubmitted: ${submission.created_at}`,
      replyTo: submission.email,
    });
  } catch (e) {
    logger.error('Failed to send contact notification', { error: e.message });
  }
}

// POST /api/contact (public)
exports.submitContact = async (req, res, next) => {
  try {
    const { name, email, church, message, source } = req.body;
    const ip = req.ip;
    const userAgent = req.get('user-agent') || null;
    const result = await query(
      `INSERT INTO contact_submissions (name, email, church, message, source, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
      [name.trim(), email.trim().toLowerCase(), church?.trim() || null, message.trim(), source || 'landing', ip, userAgent]
    );
    const submission = { ...result.rows[0], name, email, church, message };
    notify(submission); // fire-and-forget
    res.status(201).json({ success: true, message: 'Thanks! We will be in touch shortly.' });
  } catch (err) { next(err); }
};

// GET /api/contact (super_admin)
exports.listContacts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (status) { params.push(status); where.push(`status = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit, offset);
    const result = await query(
      `SELECT id, name, email, church, message, source, status, notes, created_at, reviewed_at
       FROM contact_submissions ${whereSql}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const count = await query(`SELECT COUNT(*) FROM contact_submissions ${whereSql}`, params.slice(0, params.length - 2));
    res.json({ success: true, data: result.rows, pagination: { page: Number(page), limit: Number(limit), total: Number(count.rows[0].count) } });
  } catch (err) { next(err); }
};

// PATCH /api/contact/:id (super_admin)
exports.updateContact = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const result = await query(
      `UPDATE contact_submissions
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           reviewed_at = NOW(),
           reviewed_by = $3
       WHERE id = $4
       RETURNING id, status, notes, reviewed_at`,
      [status || null, notes || null, req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};
