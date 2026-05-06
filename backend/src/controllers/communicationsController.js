const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../services/emailService');
const { sendSMS, sendWhatsApp } = require('../services/smsService');
const sanitizeHtml = require('sanitize-html');
const logger = require('../config/logger');

const getCommunications = async (req, res) => {
  const { page = 1, limit = 20, channel, status } = req.query;
  const offset = (page - 1) * limit;
  try {
    let conditions = ['c.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;
    if (channel) { conditions.push(`c.channel = $${idx++}`); params.push(channel); }
    if (status)  { conditions.push(`c.status = $${idx++}`);  params.push(status); }
    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM communications c WHERE ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT c.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM communications c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE ${where} ORDER BY c.created_at DESC
       LIMIT $${idx} OFFSET $${idx+1}`, params
    );
    return res.json({ success: true, data: rows, pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countRes.rows[0].count / limit) } });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createCommunication = async (req, res) => {
  const { title, body, channel, audience, audienceFilter, scheduledAt, branchId, imageUrl } = req.body;
  try {
    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO communications (id, church_id, branch_id, title, body, channel, audience, audience_filter, scheduled_at, created_by, status, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11) RETURNING *`,
      [id, req.churchId, branchId||null, title, body, channel, audience||'all', audienceFilter ? JSON.stringify(audienceFilter) : '{}', scheduledAt||null, req.user.id, imageUrl||null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { logger.error('createCommunication failed', { error: err.message }); return res.status(500).json({ success: false, message: 'Server error' }); }
};

// Resolve communication audience -> [{ email, phone, first_name, last_name }]
const resolveAudience = async (churchId, audience, filter = {}) => {
  const f = filter || {};
  const today = new Date().toISOString().slice(5, 10); // MM-DD
  switch (audience) {
    case 'first_timers': {
      const r = await query(
        `SELECT email, phone, first_name, last_name FROM first_timers WHERE church_id=$1`,
        [churchId]
      );
      return r.rows;
    }
    case 'male_members': {
      const r = await query(
        `SELECT email, phone, first_name, last_name FROM members
         WHERE church_id=$1 AND membership_status='active' AND gender='male'`,
        [churchId]
      );
      return r.rows;
    }
    case 'female_members': {
      const r = await query(
        `SELECT email, phone, first_name, last_name FROM members
         WHERE church_id=$1 AND membership_status='active' AND gender='female'`,
        [churchId]
      );
      return r.rows;
    }
    case 'parents': {
      const r = await query(
        `SELECT email, phone, first_name, last_name FROM members
         WHERE church_id=$1 AND membership_status='active'
           AND (COALESCE(num_children,0) > 0 OR marital_status='married')`,
        [churchId]
      );
      return r.rows;
    }
    case 'department': {
      if (!f.departmentId) return [];
      const r = await query(
        `SELECT m.email, m.phone, m.first_name, m.last_name
         FROM members m
         JOIN member_departments md ON md.member_id=m.id AND md.is_active=true
         WHERE m.church_id=$1 AND m.membership_status='active' AND md.department_id=$2`,
        [churchId, f.departmentId]
      );
      return r.rows;
    }
    case 'group': {
      if (!f.groupId) return [];
      const r = await query(
        `SELECT m.email, m.phone, m.first_name, m.last_name
         FROM members m
         JOIN member_groups mg ON mg.member_id=m.id
         WHERE m.church_id=$1 AND m.membership_status='active' AND mg.group_id=$2`,
        [churchId, f.groupId]
      );
      return r.rows;
    }
    case 'branch': {
      if (!f.branchId) return [];
      const r = await query(
        `SELECT email, phone, first_name, last_name FROM members
         WHERE church_id=$1 AND membership_status='active' AND branch_id=$2`,
        [churchId, f.branchId]
      );
      return r.rows;
    }
    case 'birthday': {
      const md = (f.date && /^\d{4}-\d{2}-\d{2}$/.test(f.date)) ? f.date.slice(5, 10) : today;
      const r = await query(
        `SELECT email, phone, first_name, last_name FROM members
         WHERE church_id=$1 AND membership_status='active'
           AND date_of_birth IS NOT NULL
           AND to_char(date_of_birth, 'MM-DD') = $2`,
        [churchId, md]
      );
      return r.rows;
    }
    case 'anniversary': {
      const md = (f.date && /^\d{4}-\d{2}-\d{2}$/.test(f.date)) ? f.date.slice(5, 10) : today;
      const r = await query(
        `SELECT email, phone, first_name, last_name FROM members
         WHERE church_id=$1 AND membership_status='active'
           AND wedding_anniversary_date IS NOT NULL
           AND to_char(wedding_anniversary_date, 'MM-DD') = $2`,
        [churchId, md]
      );
      return r.rows;
    }
    case 'all':
    case 'members':
    default: {
      const r = await query(
        `SELECT email, phone, first_name, last_name FROM members
         WHERE church_id=$1 AND membership_status='active'`,
        [churchId]
      );
      return r.rows;
    }
  }
};

const sendCommunication = async (req, res) => {
  const { id } = req.params;
  try {
    const [comm, churchRes] = await Promise.all([
      query('SELECT * FROM communications WHERE id=$1 AND church_id=$2', [id, req.churchId]),
      query('SELECT settings FROM churches WHERE id=$1', [req.churchId]),
    ]);
    if (!comm.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    const c = comm.rows[0];
    const churchSettings = churchRes.rows[0]?.settings?.messaging || {};

    // Gather recipients based on audience + audience_filter
    const recipients = await resolveAudience(req.churchId, c.audience, c.audience_filter || {});

    const recipientCount = recipients.length;
    if (recipientCount === 0) {
      return res.status(400).json({ success: false, message: 'No recipients matched the selected audience' });
    }

    // Dispatch via the appropriate channel
    try {
      if (c.channel === 'email') {
        const emails = recipients.map((r) => r.email).filter(Boolean);
        const safeHtml = sanitizeHtml(c.body, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
          allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] },
        });
        if (emails.length) await sendEmail({ to: emails, subject: c.title, html: safeHtml }, churchSettings);
      } else if (c.channel === 'whatsapp') {
        const phones = recipients.map((r) => r.phone).filter(Boolean);
        if (phones.length) await sendWhatsApp({ to: phones, body: `${c.title}\n\n${c.body}` }, churchSettings);
      } else if (c.channel === 'sms') {
        const phones = recipients.map((r) => r.phone).filter(Boolean);
        if (phones.length) await sendSMS({ to: phones, body: `${c.title}\n\n${c.body}` }, churchSettings);
      }
    } catch (deliveryErr) {
      logger.error('Communication delivery error', { id, channel: c.channel, error: deliveryErr.message });
    }

    const { rows } = await query(
      `UPDATE communications SET status='sent', sent_at=NOW(), sent_count=$3 WHERE id=$1 AND church_id=$2 RETURNING *`,
      [id, req.churchId, recipientCount]
    );
    return res.json({ success: true, data: rows[0], message: `Message sent to ${recipientCount} recipients` });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const deleteCommunication = async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM communications WHERE id=$1 AND church_id=$2 AND status=$3', [id, req.churchId, 'draft']);
    return res.json({ success: true, message: 'Draft deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getCommStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='sent') as sent,
       COUNT(*) FILTER (WHERE status='draft') as drafts,
       COALESCE(SUM(sent_count),0) as total_recipients
       FROM communications WHERE church_id=$1`, [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getCommunications, createCommunication, sendCommunication, deleteCommunication, getCommStats, resolveAudience };
