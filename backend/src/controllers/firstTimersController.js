const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { createFirstTimerRecord } = require('../services/intakeService');
const { resolveWriteBranchId, applyBranchFilter } = require('../utils/branchScope');
const { getNextMemberNumber } = require('../utils/memberNumber');
const logger = require('../config/logger');

const getFirstTimers = async (req, res) => {
  const { page = 1, limit = 20, search, followUpStatus, branchId } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = ['ft.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (search) {
      conditions.push(`(ft.first_name ILIKE $${idx} OR ft.last_name ILIKE $${idx} OR ft.phone ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (followUpStatus) { conditions.push(`ft.follow_up_status = $${idx++}`); params.push(followUpStatus); }
    if (req.branchId) {
      idx = applyBranchFilter(req, 'ft.branch_id', conditions, params, idx);
    } else if (branchId) {
      conditions.push(`ft.branch_id = $${idx++}`); params.push(branchId);
    }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM first_timers ft WHERE ${where}`, params);

    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT ft.*,
              b.name as branch_name,
              COALESCE(u.first_name || ' ' || u.last_name, am.first_name || ' ' || am.last_name) as assigned_to_name,
              am.phone as assigned_member_phone,
              EXISTS (SELECT 1 FROM member_departments md WHERE md.member_id = ft.member_id AND md.is_active = true) as has_joined_department,
              EXISTS (SELECT 1 FROM fellowship_members fm WHERE fm.member_id = ft.member_id AND fm.status = 'active') as has_joined_cell
       FROM first_timers ft
       LEFT JOIN branches b ON b.id = ft.branch_id
       LEFT JOIN users u ON u.id = ft.follow_up_assigned_to
       LEFT JOIN members am ON am.id = ft.assigned_member_id
       WHERE ${where}
       ORDER BY ft.visit_date DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countRes.rows[0].count / limit)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createFirstTimer = async (req, res) => {
  try {
    const resolvedBranch = resolveWriteBranchId(req, req.body?.branchId);
    const payload = resolvedBranch !== null ? { ...req.body, branchId: resolvedBranch } : req.body;
    const record = await createFirstTimerRecord({ churchId: req.churchId, data: payload });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error' });
  }
};

const updateFollowUpStatus = async (req, res) => {
  const { id } = req.params;
  const { followUpStatus, followUpNotes, followUpAssignedTo } = req.body;
  try {
    const { rows } = await query(
      `UPDATE first_timers
       SET follow_up_status = COALESCE($3, follow_up_status),
           follow_up_notes = COALESCE($4, follow_up_notes),
           follow_up_assigned_to = COALESCE($5, follow_up_assigned_to)
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, followUpStatus, followUpNotes, followUpAssignedTo]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'First timer not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const convertToMember = async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: ftRows } = await client.query(
      req.branchId
        ? 'SELECT * FROM first_timers WHERE id = $1 AND church_id = $2 AND branch_id = $3 FOR UPDATE'
        : 'SELECT * FROM first_timers WHERE id = $1 AND church_id = $2 FOR UPDATE',
      req.branchId ? [id, req.churchId, req.branchId] : [id, req.churchId]
    );
    if (!ftRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'First timer not found' });
    }
    const ft = ftRows[0];
    if (ft.converted_to_member) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Already converted' });
    }

    const memberNumber = await getNextMemberNumber(client, req.churchId);
    const memberId = uuidv4();

    const { rows: memberRows } = await client.query(
      `INSERT INTO members (id, church_id, branch_id, member_number, first_name, last_name,
        email, phone, gender, date_of_birth, address, join_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_DATE) RETURNING *`,
      [memberId, req.churchId, ft.branch_id, memberNumber, ft.first_name, ft.last_name,
        ft.email, ft.phone, ft.gender, ft.date_of_birth, ft.address]
    );

    await client.query(
      `UPDATE first_timers SET converted_to_member = true, member_id = $1, follow_up_status = 'converted'
       WHERE id = $2`,
      [memberId, id]
    );

    await client.query('COMMIT');
    return res.json({ success: true, data: memberRows[0], message: 'First timer converted to member' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { });
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

const getFirstTimerStats = async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const params = [req.churchId];
    let branchCond = '';
    if (req.branchId) {
      params.push(req.branchId);
      branchCond = ` AND ft.branch_id = $${params.length}`;
    }

    let dateCond = '';
    if (period === 'this_month') {
      dateCond = ` AND ft.visit_date >= DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (period === 'last_30_days') {
      dateCond = ` AND ft.visit_date >= CURRENT_DATE - INTERVAL '30 days'`;
    } else if (period === 'quarter') {
      dateCond = ` AND ft.visit_date >= CURRENT_DATE - INTERVAL '90 days'`;
    } else if (period === 'year') {
      dateCond = ` AND ft.visit_date >= DATE_TRUNC('year', CURRENT_DATE)`;
    }

    const { rows } = await query(
      `SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE ft.follow_up_status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE ft.follow_up_status = 'contacted')::int as contacted,
        COUNT(*) FILTER (WHERE ft.follow_up_status = 'converted' OR ft.converted_to_member = true OR ft.member_id IS NOT NULL)::int as converted,
        COUNT(*) FILTER (WHERE ft.visit_date >= CURRENT_DATE - INTERVAL '30 days')::int as this_month,
        COUNT(*) FILTER (WHERE LOWER(ft.gender) = 'male')::int as male,
        COUNT(*) FILTER (WHERE LOWER(ft.gender) = 'female')::int as female,
        COUNT(*) FILTER (WHERE ft.wants_to_join_church = true OR ft.decision = 'join_church')::int as wants_to_join,
        COUNT(*) FILTER (WHERE ft.decision = 'considering' OR (ft.wants_to_join_church = false AND (ft.decision IS NULL OR ft.decision != 'visiting')))::int as considering,
        COUNT(*) FILTER (WHERE ft.decision = 'visiting')::int as visiting,
        COUNT(DISTINCT ft.id) FILTER (WHERE ft.member_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM member_departments md WHERE md.member_id = ft.member_id AND md.is_active = true
        ))::int as joined_department,
        COUNT(DISTINCT ft.id) FILTER (WHERE ft.member_id IS NOT NULL AND (
          EXISTS (SELECT 1 FROM fellowship_members fm WHERE fm.member_id = ft.member_id AND fm.status = 'active')
          OR EXISTS (SELECT 1 FROM members m WHERE m.id = ft.member_id AND m.fellowship_cell_id IS NOT NULL)
        ))::int as joined_cell,
        COUNT(DISTINCT ft.id) FILTER (WHERE EXISTS (
          SELECT 1 FROM event_attendance ea
          WHERE (ea.first_timer_id = ft.id OR (ft.member_id IS NOT NULL AND ea.member_id = ft.member_id))
          GROUP BY COALESCE(ea.first_timer_id, ea.member_id)
          HAVING COUNT(*) >= 2
        ))::int as consistent
       FROM first_timers ft
       WHERE ft.church_id = $1${branchCond}${dateCond}`,
      params
    );

    const stats = rows[0] || {};
    const total = Number(stats.total || 0);
    const converted = Number(stats.converted || 0);
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    return res.json({
      success: true,
      data: {
        ...stats,
        conversion_rate: conversionRate
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFirstTimer = async (req, res) => {
  const { id } = req.params;
  const {
    firstName, lastName, email, phone, address, gender, dateOfBirth,
    howDidYouHear, visitDate, serviceAttended, prayerRequest, branchId,
    wantsToJoinChurch, decision, photoUrl,
    serviceAspectEnjoyed, service_aspect_enjoyed,
    bornAgainStatus, born_again_status,
    attendedHangout, attended_hangout,
    doneKic, done_kic,
    tribeName, tribe_name
  } = req.body;
  try {
    const effectiveBranchId = req.branchId ? req.branchId : (branchId || null);
    const finalWantsToJoin = wantsToJoinChurch !== undefined ? Boolean(wantsToJoinChurch) : null;
    const finalHangout = attendedHangout !== undefined ? Boolean(attendedHangout) : (attended_hangout !== undefined ? Boolean(attended_hangout) : null);
    const finalKic = doneKic !== undefined ? Boolean(doneKic) : (done_kic !== undefined ? Boolean(done_kic) : null);
    const params = [
      id, req.churchId, firstName, lastName, email, phone, address, gender,
      dateOfBirth || null, howDidYouHear, visitDate, serviceAttended, prayerRequest, effectiveBranchId,
      finalWantsToJoin, decision || null, photoUrl || null,
      serviceAspectEnjoyed || service_aspect_enjoyed || null,
      bornAgainStatus || born_again_status || null,
      finalHangout,
      finalKic,
      tribeName || tribe_name || null
    ];
    let branchWhere = '';
    if (req.branchId) {
      params.push(req.branchId);
      branchWhere = ` AND branch_id = $${params.length}`;
    }
    const { rows } = await query(
      `UPDATE first_timers SET
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        address = COALESCE($7, address),
        gender = COALESCE($8, gender),
        date_of_birth = COALESCE($9, date_of_birth),
        how_did_you_hear = COALESCE($10, how_did_you_hear),
        visit_date = COALESCE($11, visit_date),
        service_attended = COALESCE($12, service_attended),
        prayer_request = COALESCE($13, prayer_request),
        branch_id = COALESCE($14, branch_id),
        wants_to_join_church = COALESCE($15, wants_to_join_church),
        decision = COALESCE($16, decision),
        photo_url = COALESCE($17, photo_url),
        profile_photo_url = COALESCE($17, profile_photo_url),
        service_aspect_enjoyed = COALESCE($18, service_aspect_enjoyed),
        born_again_status = COALESCE($19, born_again_status),
        attended_hangout = COALESCE($20, attended_hangout),
        done_kic = COALESCE($21, done_kic),
        tribe_name = COALESCE($22, tribe_name),
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2${branchWhere} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'First timer not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const sequenceService = require('../services/firstTimerSequenceService');

const getSequenceSettings = async (req, res) => {
  try {
    const data = await sequenceService.getOrCreateChurchSequence(req.churchId);
    const steps = Array.isArray(data.steps) ? data.steps : [];
    const formatted = {
      ...data,
      is_active: data.is_active ?? true,
      channel: steps[0]?.channel || 'whatsapp',
      step1_template: steps[0]?.template || '',
      step2_template: steps[1]?.template || '',
      step3_template: steps[2]?.template || '',
    };
    return res.json({ success: true, data: formatted });
  } catch (err) {
    logger.error('getSequenceSettings error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error fetching sequence settings' });
  }
};

const updateSequenceSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const isActive = body.isActive !== undefined ? body.isActive : body.is_active;
    const channel = body.channel || 'whatsapp';

    let steps = body.steps;
    if (!steps || !Array.isArray(steps)) {
      steps = [
        {
          step: 1,
          delayHours: 2,
          channel: channel === 'both' ? 'whatsapp' : channel,
          template: body.step1_template || 'Dear {{firstName}}, thank you for worshiping with us at {{churchName}} today! We were truly blessed to have you in service. Pastor {{pastorName}} and the entire church family welcome you warmly. We pray that God meets you at your point of need. Have a glorious week!'
        },
        {
          step: 2,
          delayHours: 72,
          channel: channel === 'both' ? 'sms' : channel,
          template: body.step2_template || 'Hello {{firstName}}! Pastor {{pastorName}} and your {{churchName}} family are praying for you this week. If you have any prayer requests or need counseling, feel free to reply or visit us again this Sunday!'
        },
        {
          step: 3,
          delayHours: 144,
          channel: channel === 'both' ? 'whatsapp' : channel,
          template: body.step3_template || 'Happy weekend {{firstName}}! We are looking forward to having you with us again this Sunday at {{churchName}}. Join us for an inspiring time in God\'s presence. Service starts at 9:00 AM. See you there!'
        }
      ];
    }

    const data = await sequenceService.updateChurchSequence(req.churchId, {
      title: body.title || 'Standard 3-Step Visitor Follow-Up',
      isActive: isActive !== false,
      steps,
    });

    const formatted = {
      ...data,
      is_active: data.is_active,
      channel: steps[0]?.channel || channel,
      step1_template: steps[0]?.template || '',
      step2_template: steps[1]?.template || '',
      step3_template: steps[2]?.template || '',
    };

    return res.json({ success: true, data: formatted, message: 'Follow-up sequence settings updated' });
  } catch (err) {
    logger.error('updateSequenceSettings error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error updating sequence settings' });
  }
};

const getFirstTimerQueue = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await sequenceService.getFirstTimerQueue(req.churchId, id);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error fetching sequence queue' });
  }
};

const cancelFirstTimerSequence = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await sequenceService.cancelFirstTimerSequence(req.churchId, id);
    return res.json({ success: true, data, message: 'Pending automated follow-ups cancelled' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error cancelling sequence' });
  }
};

const triggerFirstTimerSequence = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM first_timers WHERE id = $1 AND church_id = $2', [id, req.churchId]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'First timer not found' });

    const { rows: churchInfo } = await query('SELECT name FROM churches WHERE id = $1', [req.churchId]);
    await sequenceService.enrollFirstTimerInSequence({
      churchId: req.churchId,
      firstTimer: rows[0],
      churchName: churchInfo[0]?.name || 'ChurchOS',
      pastorName: 'the Pastorate',
    });

    const queue = await sequenceService.getFirstTimerQueue(req.churchId, id);
    return res.json({ success: true, data: queue, message: 'Automated follow-up sequence triggered' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error triggering sequence' });
  }
};

const deleteFirstTimer = async (req, res) => {
  const { id } = req.params;
  try {
    const params = [id, req.churchId];
    let branchCond = '';
    if (req.branchId) {
      params.push(req.branchId);
      branchCond = ' AND branch_id = $3';
    }

    // Clean up follow ups and attendance records
    await query('DELETE FROM follow_ups WHERE first_timer_id = $1', [id]).catch(() => {});
    await query('DELETE FROM attendance WHERE first_timer_id = $1', [id]).catch(() => {});
    await query('DELETE FROM first_timer_sequence_queue WHERE first_timer_id = $1', [id]).catch(() => {});

    const { rows } = await query(
      `DELETE FROM first_timers WHERE id = $1 AND church_id = $2${branchCond} RETURNING id, first_name, last_name`,
      params
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'First timer not found' });
    logger.info('First timer deleted', { action: 'first_timer_delete', performedBy: req.user.id, firstTimerId: id, churchId: req.churchId });
    return res.json({ success: true, message: `First timer ${rows[0].first_name} ${rows[0].last_name} removed successfully` });
  } catch (err) {
    logger.error('deleteFirstTimer error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getFirstTimers,
  createFirstTimer,
  updateFirstTimer,
  updateFollowUpStatus,
  convertToMember,
  deleteFirstTimer,
  getFirstTimerStats,
  getSequenceSettings,
  updateSequenceSettings,
  getFirstTimerQueue,
  cancelFirstTimerSequence,
  triggerFirstTimerSequence,
};
