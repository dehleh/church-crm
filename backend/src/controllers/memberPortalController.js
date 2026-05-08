const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
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
      profilePhotoUrl: m.profile_photo_url,
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
    const [giveRes, evtRes, deptRes, grpRes, prayerRes] = await Promise.all([
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
      query(
        `SELECT d.id, d.name, md.role FROM member_departments md
         JOIN departments d ON d.id = md.department_id
         WHERE md.member_id = $1 AND md.is_active = true AND d.is_active = true`,
        [req.member.id]
      ),
      query(
        `SELECT g.id, g.name, mg.role FROM member_groups mg
         JOIN groups g ON g.id = mg.group_id
         WHERE mg.member_id = $1 AND mg.is_active = true AND g.is_active = true`,
        [req.member.id]
      ),
      query(
        `SELECT COUNT(*)::int as open FROM prayer_requests
         WHERE member_id = $1 AND status IN ('open','praying')`,
        [req.member.id]
      ),
    ]);
    return res.json({
      success: true,
      data: {
        givingYtd: giveRes.rows[0],
        upcomingEvents: evtRes.rows,
        departments: deptRes.rows,
        groups: grpRes.rows,
        openPrayers: prayerRes.rows[0]?.open || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/avatar (multipart "avatar")
const uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  try {
    const url = `/uploads/avatars/${req.file.filename}`;
    // delete old file if it lives in uploads/avatars
    if (req.member.profile_photo_url && req.member.profile_photo_url.startsWith('/uploads/avatars/')) {
      const old = path.resolve(process.env.UPLOAD_DIR || 'uploads', 'avatars', path.basename(req.member.profile_photo_url));
      fs.promises.unlink(old).catch(() => {});
    }
    await query('UPDATE members SET profile_photo_url = $1, updated_at = NOW() WHERE id = $2', [url, req.member.id]);
    return res.json({ success: true, data: { profilePhotoUrl: url } });
  } catch (err) {
    logger.error('member uploadAvatar failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/affiliations — departments + groups
const getAffiliations = async (req, res) => {
  try {
    const [deptRes, grpRes] = await Promise.all([
      query(
        `SELECT d.id, d.name, d.description, d.category, d.meeting_schedule, md.role, md.joined_at
         FROM member_departments md
         JOIN departments d ON d.id = md.department_id
         WHERE md.member_id = $1 AND md.is_active = true AND d.is_active = true
         ORDER BY d.name`,
        [req.member.id]
      ),
      query(
        `SELECT g.id, g.name, g.description, g.purpose, g.meeting_schedule, mg.role, mg.joined_at
         FROM member_groups mg
         JOIN groups g ON g.id = mg.group_id
         WHERE mg.member_id = $1 AND mg.is_active = true AND g.is_active = true
         ORDER BY g.name`,
        [req.member.id]
      ),
    ]);
    return res.json({ success: true, data: { departments: deptRes.rows, groups: grpRes.rows } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/prayer-requests — list mine
const listMyPrayerRequests = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, request, category, status, response_notes, created_at, updated_at
       FROM prayer_requests WHERE member_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.member.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/welfare/packages
const listWelfarePackages = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, description, package_type FROM welfare_packages
       WHERE church_id = $1 AND is_active = true ORDER BY name`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/welfare/applications  Body: { packageId, reason, amountRequested? }
const submitWelfareRequest = async (req, res) => {
  const { packageId, reason, amountRequested } = req.body;
  if (!packageId || !reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: 'Package and reason are required' });
  }
  try {
    const m = req.member;
    await query(
      `INSERT INTO welfare_applications
        (id, church_id, package_id, member_id, applicant_name, reason, amount_requested, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
      [
        uuidv4(), req.churchId, packageId, m.id,
        `${m.first_name} ${m.last_name}`,
        reason.trim().slice(0, 2000),
        amountRequested ? Number(amountRequested) : null,
      ]
    );
    return res.json({ success: true, message: 'Welfare request submitted' });
  } catch (err) {
    logger.error('member submitWelfareRequest failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/welfare/applications
const listMyWelfareApplications = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT wa.id, wa.reason, wa.status, wa.amount_requested, wa.amount_approved,
              wa.created_at, wa.reviewed_at, wp.name as package_name, wp.package_type
       FROM welfare_applications wa
       JOIN welfare_packages wp ON wp.id = wa.package_id
       WHERE wa.member_id = $1
       ORDER BY wa.created_at DESC LIMIT 50`,
      [req.member.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/counseling  Body: { sessionType, notes, preferredDate? }
const submitCounselingRequest = async (req, res) => {
  const { sessionType, notes, preferredDate } = req.body;
  if (!notes || !notes.trim()) {
    return res.status(400).json({ success: false, message: 'Please describe what you need counsel about' });
  }
  try {
    const m = req.member;
    await query(
      `INSERT INTO counseling_sessions
        (id, church_id, branch_id, member_id, requester_name, session_type, status, scheduled_at, notes, is_confidential)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,true)`,
      [
        uuidv4(), req.churchId, m.branch_id || null, m.id,
        `${m.first_name} ${m.last_name}`,
        sessionType || 'general',
        preferredDate ? new Date(preferredDate) : null,
        notes.trim().slice(0, 2000),
      ]
    );
    return res.json({ success: true, message: 'Counseling request submitted' });
  } catch (err) {
    logger.error('member submitCounselingRequest failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/counseling
const listMyCounselingSessions = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, session_type, status, scheduled_at, completed_at, notes, created_at
       FROM counseling_sessions WHERE member_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.member.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getGiving,
  getEvents,
  submitPrayerRequest,
  listMyPrayerRequests,
  getHome,
  uploadAvatar,
  getAffiliations,
  listWelfarePackages,
  submitWelfareRequest,
  listMyWelfareApplications,
  submitCounselingRequest,
  listMyCounselingSessions,
};
