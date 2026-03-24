const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');
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
  const { title, body, channel, audience, audienceFilter, scheduledAt, branchId } = req.body;
  try {
    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO communications (id, church_id, branch_id, title, body, channel, audience, audience_filter, scheduled_at, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft') RETURNING *`,
      [id, req.churchId, branchId||null, title, body, channel, audience||'all', audienceFilter||{}, scheduledAt||null, req.user.id]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const sendCommunication = async (req, res) => {
  const { id } = req.params;
  try {
    const comm = await query('SELECT * FROM communications WHERE id=$1 AND church_id=$2', [id, req.churchId]);
    if (!comm.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    const c = comm.rows[0];

    // Gather recipients based on audience
    let recipients = [];
    if (c.audience === 'all' || c.audience === 'members') {
      const r = await query(
        'SELECT email, phone FROM members WHERE church_id=$1 AND membership_status=$2',
        [req.churchId, 'active']
      );
      recipients = r.rows;
    }

    const recipientCount = recipients.length;

    // Dispatch via the appropriate channel
    try {
      if (c.channel === 'email') {
        const emails = recipients.map((r) => r.email).filter(Boolean);
        if (emails.length) await sendEmail({ to: emails, subject: c.title, html: c.body });
      } else if (c.channel === 'sms' || c.channel === 'whatsapp') {
        const phones = recipients.map((r) => r.phone).filter(Boolean);
        if (phones.length) await sendSMS({ to: phones, body: `${c.title}\n\n${c.body}` });
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

module.exports = { getCommunications, createCommunication, sendCommunication, deleteCommunication, getCommStats };
