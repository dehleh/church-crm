const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { sendSMS, sendWhatsApp } = require('../services/smsService');

/**
 * GET /api/service-plans
 */
const listServicePlans = async (req, res) => {
  const { branchId, page = 1, limit = 20, fromDate, toDate } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = ['sp.church_id = $1'];
    let params = [req.churchId];
    let i = 2;

    if (req.branchId) {
      conditions.push(`(sp.branch_id = $${i} OR sp.branch_id IS NULL)`);
      params.push(req.branchId);
      i++;
    } else if (branchId) {
      conditions.push(`sp.branch_id = $${i++}`);
      params.push(branchId);
    }

    if (fromDate) {
      conditions.push(`sp.service_date >= $${i++}`);
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push(`sp.service_date <= $${i++}`);
      params.push(toDate);
    }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM service_plans sp WHERE ${where}`, params);

    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT sp.*,
              b.name as branch_name,
              u.first_name || ' ' || u.last_name as created_by_name,
              (SELECT COUNT(*) FROM service_order_items soi WHERE soi.plan_id = sp.id)::int as items_count,
              (SELECT COALESCE(SUM(duration_minutes), 0) FROM service_order_items soi WHERE soi.plan_id = sp.id)::int as total_duration_minutes,
              (SELECT COUNT(*) FROM service_volunteers sv WHERE sv.plan_id = sp.id)::int as volunteers_count,
              (SELECT COUNT(*) FROM service_volunteers sv WHERE sv.plan_id = sp.id AND sv.status = 'confirmed')::int as confirmed_volunteers_count
       FROM service_plans sp
       LEFT JOIN branches b ON b.id = sp.branch_id
       LEFT JOIN users u ON u.id = sp.created_by
       WHERE ${where}
       ORDER BY sp.service_date DESC, sp.start_time DESC
       LIMIT $${i++} OFFSET $${i++}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countRes.rows[0].count, 10),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(countRes.rows[0].count / limit),
      },
    });
  } catch (err) {
    logger.error('listServicePlans failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/service-plans/:id
 */
const getServicePlan = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: planRows } = await query(
      `SELECT sp.*,
              b.name as branch_name,
              u.first_name || ' ' || u.last_name as created_by_name
       FROM service_plans sp
       LEFT JOIN branches b ON b.id = sp.branch_id
       LEFT JOIN users u ON u.id = sp.created_by
       WHERE sp.id = $1 AND sp.church_id = $2`,
      [id, req.churchId]
    );

    if (!planRows[0]) {
      return res.status(404).json({ success: false, message: 'Service plan not found' });
    }

    const [itemsRes, volunteersRes] = await Promise.all([
      query(
        `SELECT * FROM service_order_items
         WHERE plan_id = $1
         ORDER BY sort_order ASC, created_at ASC`,
        [id]
      ),
      query(
        `SELECT sv.*,
                m.first_name, m.last_name, m.phone, m.email, m.avatar_url,
                d.name as department_name
         FROM service_volunteers sv
         JOIN members m ON m.id = sv.member_id
         LEFT JOIN departments d ON d.id = sv.department_id
         WHERE sv.plan_id = $1
         ORDER BY sv.role_title ASC`,
        [id]
      ),
    ]);

    const plan = planRows[0];
    plan.items = itemsRes.rows;
    plan.volunteers = volunteersRes.rows;
    plan.total_duration_minutes = itemsRes.rows.reduce((sum, item) => sum + (Number(item.duration_minutes) || 0), 0);

    return res.json({ success: true, data: plan });
  } catch (err) {
    logger.error('getServicePlan failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/service-plans
 */
const createServicePlan = async (req, res) => {
  const {
    title, serviceDate, startTime, endTime, theme, seriesTitle, notes,
    status = 'published', branchId, items = [], volunteers = []
  } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const planId = uuidv4();
    const finalBranch = req.branchId || branchId || null;

    const { rows: planRows } = await client.query(
      `INSERT INTO service_plans (
        id, church_id, branch_id, title, service_date, start_time, end_time,
        theme, series_title, notes, status, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        planId, req.churchId, finalBranch, title, serviceDate, startTime, endTime || null,
        theme || null, seriesTitle || null, notes || null, status, req.user?.id || null
      ]
    );

    // Default template items if none provided
    const defaultItems = [
      { sort_order: 1, duration_minutes: 10, title: 'Opening Prayer & Call to Worship', item_type: 'prayer', minister_name: 'Minister on Duty' },
      { sort_order: 2, duration_minutes: 25, title: 'Praise & Worship', item_type: 'worship', minister_name: 'Choir / Worship Team' },
      { sort_order: 3, duration_minutes: 10, title: 'Welcome & First-Timer Reception', item_type: 'announcement', minister_name: 'Protocol / Ushers' },
      { sort_order: 4, duration_minutes: 15, title: 'Tithes & Offering Exhortation', item_type: 'giving', minister_name: 'Pastoral Team' },
      { sort_order: 5, duration_minutes: 40, title: 'The Ministry of the Word', item_type: 'word', minister_name: 'Preacher' },
      { sort_order: 6, duration_minutes: 10, title: 'Altar Call & Benediction', item_type: 'prayer', minister_name: 'Senior Pastor' },
    ];

    const finalItems = items && items.length > 0 ? items : defaultItems;

    for (let i = 0; i < finalItems.length; i++) {
      const it = finalItems[i];
      await client.query(
        `INSERT INTO service_order_items (
          id, plan_id, sort_order, duration_minutes, title, item_type, minister_name, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          uuidv4(), planId, it.sort_order ?? (i + 1), Number(it.duration_minutes) || 10,
          it.title, it.item_type || 'general', it.minister_name || null, it.notes || null
        ]
      );
    }

    if (volunteers && volunteers.length > 0) {
      for (const v of volunteers) {
        if (!v.memberId) continue;
        await client.query(
          `INSERT INTO service_volunteers (
            id, plan_id, role_title, department_id, member_id, status, notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            uuidv4(), planId, v.roleTitle || 'Volunteer', v.departmentId || null,
            v.memberId, v.status || 'assigned', v.notes || null
          ]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: planRows[0], message: 'Service plan created successfully' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('createServicePlan failed', { error: err.message });
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/service-plans/:id
 */
const updateServicePlan = async (req, res) => {
  const { id } = req.params;
  const {
    title, serviceDate, startTime, endTime, theme, seriesTitle, notes, status, branchId
  } = req.body;

  try {
    const { rows } = await query(
      `UPDATE service_plans SET
        title = COALESCE($3, title),
        service_date = COALESCE($4, service_date),
        start_time = COALESCE($5, start_time),
        end_time = COALESCE($6, end_time),
        theme = COALESCE($7, theme),
        series_title = COALESCE($8, series_title),
        notes = COALESCE($9, notes),
        status = COALESCE($10, status),
        branch_id = COALESCE($11, branch_id),
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      [
        id, req.churchId, title, serviceDate, startTime, endTime,
        theme, seriesTitle, notes, status, branchId || null
      ]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Service plan not found' });
    return res.json({ success: true, data: rows[0], message: 'Service plan updated' });
  } catch (err) {
    logger.error('updateServicePlan failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/service-plans/:id
 */
const deleteServicePlan = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      'DELETE FROM service_plans WHERE id = $1 AND church_id = $2 RETURNING id, title',
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Service plan not found' });
    return res.json({ success: true, message: `Service plan '${rows[0].title}' deleted` });
  } catch (err) {
    logger.error('deleteServicePlan failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/service-plans/:id/items — bulk replace run-sheet segments
 */
const updateRunSheetItems = async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Items array is required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verify ownership
    const check = await client.query(
      'SELECT id FROM service_plans WHERE id = $1 AND church_id = $2',
      [id, req.churchId]
    );
    if (!check.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Service plan not found' });
    }

    // Delete existing items and insert new
    await client.query('DELETE FROM service_order_items WHERE plan_id = $1', [id]);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await client.query(
        `INSERT INTO service_order_items (
          id, plan_id, sort_order, duration_minutes, title, item_type, minister_name, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          uuidv4(), id, it.sort_order ?? (i + 1), Number(it.duration_minutes) || 10,
          it.title, it.item_type || 'general', it.minister_name || null, it.notes || null
        ]
      );
    }

    await client.query('COMMIT');
    const { rows } = await query(
      'SELECT * FROM service_order_items WHERE plan_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [id]
    );
    return res.json({ success: true, data: rows, message: 'Run-sheet items updated' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('updateRunSheetItems failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/service-plans/:id/volunteers
 */
const addVolunteer = async (req, res) => {
  const { id } = req.params;
  const { roleTitle, departmentId, memberId, status = 'assigned', notes } = req.body;

  if (!roleTitle || !memberId) {
    return res.status(400).json({ success: false, message: 'Role title and member are required' });
  }

  try {
    const check = await query('SELECT id FROM service_plans WHERE id = $1 AND church_id = $2', [id, req.churchId]);
    if (!check.rows[0]) return res.status(404).json({ success: false, message: 'Service plan not found' });

    const volunteerId = uuidv4();
    await query(
      `INSERT INTO service_volunteers (id, plan_id, role_title, department_id, member_id, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [volunteerId, id, roleTitle, departmentId || null, memberId, status, notes || null]
    );

    const { rows } = await query(
      `SELECT sv.*, m.first_name, m.last_name, m.phone, m.email, m.avatar_url, d.name as department_name
       FROM service_volunteers sv
       JOIN members m ON m.id = sv.member_id
       LEFT JOIN departments d ON d.id = sv.department_id
       WHERE sv.id = $1`,
      [volunteerId]
    );

    return res.status(201).json({ success: true, data: rows[0], message: 'Volunteer assigned to service' });
  } catch (err) {
    logger.error('addVolunteer failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/service-plans/:id/volunteers/:volunteerId
 */
const removeVolunteer = async (req, res) => {
  const { id, volunteerId } = req.params;
  try {
    const { rows } = await query(
      `DELETE FROM service_volunteers
       WHERE id = $1 AND plan_id IN (SELECT id FROM service_plans WHERE id = $2 AND church_id = $3)
       RETURNING id`,
      [volunteerId, id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Volunteer assignment not found' });
    return res.json({ success: true, message: 'Volunteer removed from service' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PATCH /api/service-plans/:id/volunteers/:volunteerId/status
 */
const updateVolunteerStatus = async (req, res) => {
  const { id, volunteerId } = req.params;
  const { status } = req.body;

  if (!['assigned', 'confirmed', 'declined'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const { rows } = await query(
      `UPDATE service_volunteers SET status = $1
       WHERE id = $2 AND plan_id IN (SELECT id FROM service_plans WHERE id = $3 AND church_id = $4)
       RETURNING *`,
      [status, volunteerId, id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Volunteer assignment not found' });
    return res.json({ success: true, data: rows[0], message: `Status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/service-plans/:id/volunteers/remind
 */
const sendVolunteerReminders = async (req, res) => {
  const { id } = req.params;
  const { channel = 'whatsapp', volunteerIds } = req.body;

  try {
    const { rows: planRows } = await query(
      `SELECT sp.*, c.name as church_name, c.settings as church_settings
       FROM service_plans sp
       JOIN churches c ON c.id = sp.church_id
       WHERE sp.id = $1 AND sp.church_id = $2`,
      [id, req.churchId]
    );
    if (!planRows[0]) return res.status(404).json({ success: false, message: 'Service plan not found' });
    const plan = planRows[0];
    const messagingCfg = plan.church_settings?.messaging || {};

    let vQuery = `
      SELECT sv.*, m.first_name, m.last_name, m.phone, m.email
      FROM service_volunteers sv
      JOIN members m ON m.id = sv.member_id
      WHERE sv.plan_id = $1
    `;
    const params = [id];
    if (Array.isArray(volunteerIds) && volunteerIds.length > 0) {
      vQuery += ` AND sv.id = ANY($2)`;
      params.push(volunteerIds);
    }

    const { rows: volunteers } = await query(vQuery, params);
    if (!volunteers.length) {
      return res.status(400).json({ success: false, message: 'No volunteers found to remind' });
    }

    let sentCount = 0;
    const dateFormatted = new Date(plan.service_date).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    for (const v of volunteers) {
      if (!v.phone) continue;
      const msg = `Dear ${v.first_name}, this is a gentle reminder that you are scheduled as *${v.role_title}* for *${plan.title}* on ${dateFormatted} at ${plan.start_time.substring(0, 5)}.\n\nChurch: ${plan.church_name}\nPlease reply to confirm your availability. God bless you for serving!`;

      try {
        if (channel === 'whatsapp') {
          await sendWhatsApp({ to: v.phone, message: msg, churchSettings: messagingCfg });
        } else {
          await sendSMS({ to: v.phone, message: msg, churchSettings: messagingCfg });
        }
        await query('UPDATE service_volunteers SET reminder_sent_at = NOW() WHERE id = $1', [v.id]);
        sentCount++;
      } catch (sendErr) {
        logger.warn('Failed to send volunteer reminder', { volunteerId: v.id, error: sendErr.message });
      }
    }

    return res.json({
      success: true,
      message: `Dispatched ${sentCount} reminders via ${channel.toUpperCase()}`,
      sentCount,
    });
  } catch (err) {
    logger.error('sendVolunteerReminders failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  listServicePlans,
  getServicePlan,
  createServicePlan,
  updateServicePlan,
  deleteServicePlan,
  updateRunSheetItems,
  addVolunteer,
  removeVolunteer,
  updateVolunteerStatus,
  sendVolunteerReminders,
};
