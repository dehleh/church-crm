const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const PROFILE_FIELDS = [
  'phone', 'phone_alt', 'address', 'city', 'state', 'country',
  'occupation', 'employer', 'marital_status', 'wedding_anniversary_date',
  'num_children', 'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship',
];

// GET /api/me/profile
const getProfile = async (req, res) => {
  const m = req.member;
  return res.json({
    success: true,
    data: {
      id: m.id,
      memberNumber: m.member_number,
      firstName: m.first_name,
      lastName: m.last_name,
      middleName: m.middle_name,
      email: m.email,
      phone: m.phone,
      phoneAlt: m.phone_alt,
      dateOfBirth: m.date_of_birth,
      gender: m.gender,
      maritalStatus: m.marital_status,
      weddingAnniversaryDate: m.wedding_anniversary_date,
      numChildren: m.num_children,
      address: m.address,
      city: m.city,
      state: m.state,
      country: m.country,
      occupation: m.occupation,
      employer: m.employer,
      nextOfKinName: m.next_of_kin_name,
      nextOfKinPhone: m.next_of_kin_phone,
      nextOfKinRelationship: m.next_of_kin_relationship,
      churchName: m.church_name,
      churchSlug: m.church_slug,
      joinDate: m.join_date,
    },
  });
};

// PATCH /api/me/profile
const updateProfile = async (req, res) => {
  const updates = {};
  Object.entries(req.body || {}).forEach(([k, v]) => {
    const snake = k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    if (PROFILE_FIELDS.includes(snake)) {
      updates[snake] = v === '' ? null : v;
    }
  });
  const fields = Object.keys(updates);
  if (!fields.length) return res.status(400).json({ success: false, message: 'No editable fields provided' });
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);
  try {
    await query(`UPDATE members SET ${setClause}, updated_at = NOW() WHERE id = $1`, [req.member.id, ...values]);
    return res.json({ success: true });
  } catch (err) {
    logger.error('member updateProfile failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/giving
const getGiving = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.id, t.amount, t.transaction_date, t.description, t.payment_method, t.reference,
              gc.name as category
       FROM transactions t
       LEFT JOIN giving_categories gc ON gc.id = t.category_id
       WHERE t.church_id = $1 AND t.member_id = $2 AND t.transaction_type = 'income'
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT 200`,
      [req.churchId, req.member.id]
    );
    const totalRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as total,
              COALESCE(SUM(CASE WHEN transaction_date >= date_trunc('year', CURRENT_DATE) THEN amount ELSE 0 END), 0) as ytd
       FROM transactions WHERE church_id = $1 AND member_id = $2 AND transaction_type = 'income'`,
      [req.churchId, req.member.id]
    );
    return res.json({ success: true, data: { items: rows, totals: totalRes.rows[0] } });
  } catch (err) {
    logger.error('member getGiving failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/events
const getEvents = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, description, event_type, start_datetime, end_datetime,
              location, is_online, online_link
       FROM events
       WHERE church_id = $1 AND start_datetime >= NOW() - INTERVAL '1 day'
         AND status IN ('upcoming', 'ongoing')
       ORDER BY start_datetime ASC
       LIMIT 30`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/prayer-requests
const submitPrayerRequest = async (req, res) => {
  const { request, category } = req.body;
  if (!request || !request.trim()) {
    return res.status(400).json({ success: false, message: 'Prayer request is required' });
  }
  try {
    const m = req.member;
    await query(
      `INSERT INTO prayer_requests (id, church_id, branch_id, member_id, requester_name, request, category, is_anonymous)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
      [
        uuidv4(), req.churchId, m.branch_id || null, m.id,
        `${m.first_name} ${m.last_name}`,
        request.trim().slice(0, 2000),
        category || 'others',
      ]
    );
    return res.json({ success: true, message: 'Prayer request submitted' });
  } catch (err) {
    logger.error('member submitPrayerRequest failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/home — quick dashboard stats
const getHome = async (req, res) => {
  try {
    const [giveRes, evtRes] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(amount), 0) as ytd, COUNT(*) as count
         FROM transactions
         WHERE church_id = $1 AND member_id = $2 AND transaction_type = 'income'
           AND transaction_date >= date_trunc('year', CURRENT_DATE)`,
        [req.churchId, req.member.id]
      ),
      query(
        `SELECT id, title, start_datetime, location FROM events
         WHERE church_id = $1 AND start_datetime >= NOW()
           AND status IN ('upcoming','ongoing')
         ORDER BY start_datetime ASC LIMIT 3`,
        [req.churchId]
      ),
    ]);
    return res.json({
      success: true,
      data: {
        givingYtd: giveRes.rows[0],
        upcomingEvents: evtRes.rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getProfile, updateProfile, getGiving, getEvents, submitPrayerRequest, getHome };
