const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { createMemberRecord } = require('../services/intakeService');
const paymentService = require('../services/paymentService');

// GET /api/members
const getMembers = async (req, res) => {
  const { page = 1, limit = 20, search, status, branchId, departmentId, isWorker, hasChildren, cellId, birthdayMonth, designation } = req.query;
  const offset = (page - 1) * limit;
  const churchId = req.churchId;

  try {
    let conditions = ['m.church_id = $1'];
    let params = [churchId];
    let idx = 2;

    if (search) {
      conditions.push(`(m.first_name ILIKE $${idx} OR m.last_name ILIKE $${idx} OR m.email ILIKE $${idx} OR m.phone ILIKE $${idx} OR m.member_number ILIKE $${idx} OR fc.name ILIKE $${idx} OR m.leadership_title ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (status) { conditions.push(`m.membership_status = $${idx}`); params.push(status); idx++; }
    if (branchId) { conditions.push(`m.branch_id = $${idx}`); params.push(branchId); idx++; }
    if (cellId) { conditions.push(`m.fellowship_cell_id = $${idx}`); params.push(cellId); idx++; }
    if (designation) { conditions.push(`m.designation = $${idx}`); params.push(designation); idx++; }
    if (isWorker !== undefined && isWorker !== '') {
      conditions.push(`m.is_worker = $${idx}`);
      params.push(isWorker === 'true' || isWorker === true);
      idx++;
    }
    if (hasChildren === 'true' || hasChildren === true) {
      conditions.push(`(m.has_children = true OR COALESCE(m.children_count, 0) > 0 OR COALESCE(m.teenagers_count, 0) > 0)`);
    }
    if (birthdayMonth) {
      conditions.push(`EXTRACT(MONTH FROM m.date_of_birth) = $${idx}`);
      params.push(parseInt(birthdayMonth));
      idx++;
    }
    if (departmentId) {
      conditions.push(`EXISTS (SELECT 1 FROM member_departments md WHERE md.member_id = m.id AND md.department_id = $${idx} AND md.is_active = true)`);
      params.push(departmentId); idx++;
    }

    const where = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM members m
       LEFT JOIN fellowship_centers fc ON fc.id = m.fellowship_cell_id
       WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT m.*, b.name as branch_name,
              fc.name as fellowship_cell_name, fc.meeting_day as fellowship_meeting_day, fc.meeting_time as fellowship_meeting_time,
              ap.first_name || ' ' || ap.last_name as assigned_pastor_name,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', d.id, 'name', d.name)) FILTER (WHERE d.id IS NOT NULL), '[]') as departments
       FROM members m
       LEFT JOIN branches b ON b.id = m.branch_id
       LEFT JOIN fellowship_centers fc ON fc.id = m.fellowship_cell_id
       LEFT JOIN members ap ON ap.id = m.assigned_pastor_id
       LEFT JOIN member_departments md ON md.member_id = m.id AND md.is_active = true
       LEFT JOIN departments d ON d.id = md.department_id
       WHERE ${where}
       GROUP BY m.id, b.name, fc.name, fc.meeting_day, fc.meeting_time, ap.first_name, ap.last_name
       ORDER BY m.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    logger.error(err.message, { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/members/:id
const getMember = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT m.*, b.name as branch_name,
              fc.name as fellowship_cell_name, fc.meeting_day as fellowship_meeting_day, fc.meeting_time as fellowship_meeting_time, fc.host_address as fellowship_cell_address,
              ap.first_name || ' ' || ap.last_name as assigned_pastor_name,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', d.id, 'name', d.name, 'role', md.role)) FILTER (WHERE d.id IS NOT NULL), '[]') as departments
       FROM members m
       LEFT JOIN branches b ON b.id = m.branch_id
       LEFT JOIN fellowship_centers fc ON fc.id = m.fellowship_cell_id
       LEFT JOIN members ap ON ap.id = m.assigned_pastor_id
       LEFT JOIN member_departments md ON md.member_id = m.id AND md.is_active = true
       LEFT JOIN departments d ON d.id = md.department_id
       WHERE m.id = $1 AND m.church_id = $2
       GROUP BY m.id, b.name, fc.name, fc.meeting_day, fc.meeting_time, fc.host_address, ap.first_name, ap.last_name`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Member not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/members
const createMember = async (req, res) => {
  try {
    const record = await createMemberRecord({ churchId: req.churchId, data: req.body, user: req.user });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    logger.error(err.message, { error: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error' });
  }
};

const ALLOWED_MEMBER_FIELDS = [
  'branch_id', 'first_name', 'last_name', 'middle_name', 'email', 'phone', 'phone_alt',
  'date_of_birth', 'gender', 'marital_status', 'address', 'city', 'state', 'country',
  'occupation', 'employer', 'profile_photo_url', 'membership_status', 'membership_class',
  'join_date', 'baptism_date', 'water_baptized', 'holy_spirit_baptized', 'tithe_number',
  'emergency_contact_name', 'emergency_contact_phone', 'notes',
  'has_children', 'children_count', 'teenagers_count', 'children_details',
  'is_worker', 'worker_unit', 'worker_role', 'fellowship_cell_id',
  'designation', 'leadership_title', 'assigned_pastor_id'
];

// PUT /api/members/:id
const updateMember = async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  try {
    const validUpdates = {};
    Object.entries(updates).forEach(([k, v]) => {
      const snake = k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
      if (ALLOWED_MEMBER_FIELDS.includes(snake)) {
        validUpdates[snake] = v === '' ? null : v;
      }
    });

    const fields = Object.keys(validUpdates);
    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No editable fields provided' });
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => validUpdates[f]);

    const { rows } = await query(
      `UPDATE members SET ${setClause}, updated_at = NOW() WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, ...values]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Member not found' });

    // Sync fellowship cell membership if cell changed
    if (validUpdates.fellowship_cell_id) {
      await query(
        `INSERT INTO fellowship_members (id, church_id, center_id, member_id, role, status)
         VALUES ($1, $2, $3, $4, 'member', 'active')
         ON CONFLICT (center_id, member_id) DO NOTHING`,
        [uuidv4(), req.churchId, validUpdates.fellowship_cell_id, id]
      );
    }

    // Sync worker department if worker unit changed
    if (validUpdates.is_worker && validUpdates.worker_unit) {
      const deptRes = await query(
        `SELECT id FROM departments WHERE church_id = $1 AND (name ILIKE $2 OR id::text = $2) LIMIT 1`,
        [req.churchId, validUpdates.worker_unit]
      );
      if (deptRes.rows.length) {
        await query(
          `INSERT INTO member_departments (church_id, member_id, department_id, role, is_active)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT DO NOTHING`,
          [req.churchId, id, deptRes.rows[0].id, validUpdates.worker_role || 'worker']
        );
      }
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('updateMember failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/members/:id (soft delete)
const deleteMember = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `UPDATE members SET membership_status = 'inactive' WHERE id = $1 AND church_id = $2 RETURNING id`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Member not found' });
    return res.json({ success: true, message: 'Member deactivated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/members/stats
const getMemberStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        COUNT(*) FILTER (WHERE membership_status = 'active') as active,
        COUNT(*) FILTER (WHERE membership_status = 'pending_review') as pending_review,
        COUNT(*) FILTER (WHERE membership_status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE membership_class = 'child') as children,
        COUNT(*) FILTER (WHERE membership_class = 'youth') as youth,
        COALESCE(SUM(children_count), 0)::int as total_children,
        COALESCE(SUM(teenagers_count), 0)::int as total_teenagers,
        COUNT(*) FILTER (WHERE has_children = true OR COALESCE(children_count, 0) > 0 OR COALESCE(teenagers_count, 0) > 0) as families_with_children,
        COUNT(*) FILTER (WHERE is_worker = true) as workers_count,
        COUNT(*) FILTER (WHERE designation = 'pastor') as pastors_count,
        COUNT(*) FILTER (WHERE designation = 'director') as directors_count,
        COUNT(*) FILTER (WHERE designation = 'hod') as hods_count,
        COUNT(*) FILTER (WHERE designation = 'minister') as ministers_count,
        COUNT(*) FILTER (WHERE fellowship_cell_id IS NOT NULL) as cell_members_count,
        COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)) as birthdays_this_month,
        COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)) as birthdays_today,
        COUNT(*) FILTER (WHERE gender = 'male') as male,
        COUNT(*) FILTER (WHERE gender = 'female') as female,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
       FROM members WHERE church_id = $1`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/members/birthdays
const getUpcomingBirthdays = async (req, res) => {
  try {
    const { days = 30, month } = req.query;
    let monthCondition = '';
    const params = [req.churchId];

    if (month) {
      params.push(parseInt(month));
      monthCondition = `AND EXTRACT(MONTH FROM m.date_of_birth) = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT 
        m.id, m.first_name, m.last_name, m.email, m.phone, m.profile_photo_url,
        m.date_of_birth, m.member_number,
        EXTRACT(DAY FROM m.date_of_birth)::int as birth_day,
        EXTRACT(MONTH FROM m.date_of_birth)::int as birth_month,
        (
          MAKE_DATE(
            CASE 
              WHEN (EXTRACT(MONTH FROM m.date_of_birth) < EXTRACT(MONTH FROM CURRENT_DATE))
                OR (EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM m.date_of_birth) < EXTRACT(DAY FROM CURRENT_DATE))
              THEN EXTRACT(YEAR FROM CURRENT_DATE)::int + 1
              ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int
            END,
            EXTRACT(MONTH FROM m.date_of_birth)::int,
            CASE 
              WHEN EXTRACT(MONTH FROM m.date_of_birth) = 2 AND EXTRACT(DAY FROM m.date_of_birth) = 29 THEN 28
              ELSE EXTRACT(DAY FROM m.date_of_birth)::int
            END
          ) - CURRENT_DATE
        )::int as days_until,
        (EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)) as is_today
       FROM members m
       WHERE m.church_id = $1 AND m.date_of_birth IS NOT NULL AND m.membership_status = 'active' ${monthCondition}
       ORDER BY days_until ASC
       LIMIT 50`,
      params
    );

    const filtered = month ? rows : rows.filter(r => r.days_until <= parseInt(days));

    return res.json({ success: true, data: filtered });
  } catch (err) {
    logger.error('getUpcomingBirthdays error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/members/:id/birthday-wish
const sendBirthdayWish = async (req, res) => {
  const { id } = req.params;
  const { channel = 'whatsapp', customMessage } = req.body;
  const { sendWhatsApp, sendSMS } = require('../services/smsService');
  const { sendEmail } = require('../services/emailService');

  try {
    const { rows } = await query(
      `SELECT m.*, ch.name as church_name, ch.settings as church_settings
       FROM members m
       JOIN churches ch ON ch.id = m.church_id
       WHERE m.id = $1 AND m.church_id = $2`,
      [id, req.churchId]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Member not found' });
    const member = rows[0];
    const churchSettings = member.church_settings?.messaging || {};

    const greeting = customMessage || 
      `Happy Birthday, ${member.first_name}! 🎂🎉\n\nThe leadership and family of ${member.church_name} celebrate God's amazing grace and faithfulness in your life today! May this new year overflow with divine wisdom, health, joy, and peace in Jesus' name! Have a glorious celebration! ✨`;

    let delivered = false;
    let channelUsed = channel;

    if ((channel === 'whatsapp' || channel === 'all') && member.phone) {
      const waResult = await sendWhatsApp({ to: member.phone, body: greeting }, churchSettings);
      delivered = delivered || waResult.success;
    }
    if ((channel === 'sms' || channel === 'all') && member.phone && !delivered) {
      const smsResult = await sendSMS({ to: member.phone, body: greeting }, churchSettings);
      delivered = delivered || smsResult.success;
    }
    if ((channel === 'email' || channel === 'all') && member.email) {
      await sendEmail({
        to: member.email,
        subject: `Happy Birthday from ${member.church_name}! 🎂🎉`,
        html: `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333;">
          <h2 style="color: #4f46e5;">Happy Birthday, ${member.first_name}! 🎂🎉</h2>
          <p>${greeting.replace(/\n/g, '<br/>')}</p>
          <p style="margin-top: 30px; font-weight: bold;">With love and prayers,<br/>${member.church_name}</p>
        </div>`,
      });
      delivered = true;
    }

    await query(
      `UPDATE members SET last_birthday_wish_year = EXTRACT(YEAR FROM CURRENT_DATE) WHERE id = $1`,
      [id]
    );

    return res.json({
      success: true,
      message: `Birthday greeting dispatched to ${member.first_name}!`,
      channel: channelUsed,
      delivered
    });
  } catch (err) {
    logger.error('sendBirthdayWish error', { error: err.message });
    return res.status(500).json({ success: false, message: err.message || 'Failed to send birthday wish' });
  }
};

// GET /api/members/:id/virtual-account
const getMemberVirtualAccount = async (req, res) => {
  const { id } = req.params;
  const churchId = req.churchId;
  try {
    const { rows } = await query(
      `SELECT mva.*,
         COALESCE((
           SELECT SUM(amount) FROM transactions
           WHERE member_id = mva.member_id AND payment_method = 'bank_transfer'
         ), 0) as total_given
       FROM member_virtual_accounts mva
       WHERE mva.member_id = $1 AND mva.church_id = $2 AND mva.is_active = true`,
      [id, churchId]
    );
    return res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    logger.error('getMemberVirtualAccount error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/members/:id/virtual-account
const assignMemberVirtualAccount = async (req, res) => {
  const { id } = req.params;
  const churchId = req.churchId;
  try {
    const memberRes = await query(
      `SELECT id, first_name, last_name, email, phone FROM members WHERE id = $1 AND church_id = $2`,
      [id, churchId]
    );
    if (!memberRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    const churchRes = await query(
      `SELECT name, payment_settings FROM churches WHERE id = $1`,
      [churchId]
    );
    const church = churchRes.rows[0] || {};

    const account = await paymentService.assignDedicatedVirtualAccount({
      churchId,
      member: memberRes.rows[0],
      churchName: church.name,
      churchSettings: church.payment_settings,
    });

    return res.json({ success: true, data: account });
  } catch (err) {
    logger.error('assignMemberVirtualAccount error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to assign virtual bank account' });
  }
};

module.exports = {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  getMemberStats,
  getUpcomingBirthdays,
  sendBirthdayWish,
  getMemberVirtualAccount,
  assignMemberVirtualAccount
};
