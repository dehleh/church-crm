const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

// ── 1. Settings & Terminology ─────────────────────────────────
const getFellowshipSettings = async (req, res) => {
  try {
    const { rows } = await query('SELECT settings FROM churches WHERE id = $1', [req.churchId]);
    const settings = rows[0]?.settings || {};
    const fellowship = settings.fellowship || {
      systemName: 'House Fellowship',
      singularTerm: 'Fellowship Center',
      pluralTerm: 'Fellowship Centers',
      zoneTerm: 'Zone',
      meetingDay: 'Wednesday',
      meetingTime: '18:30',
      defaultCapacity: 15,
    };
    return res.json({ success: true, data: fellowship });
  } catch (err) {
    logger.error('getFellowshipSettings failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFellowshipSettings = async (req, res) => {
  const { systemName, singularTerm, pluralTerm, zoneTerm, meetingDay, meetingTime, defaultCapacity } = req.body;
  try {
    const { rows } = await query('SELECT settings FROM churches WHERE id = $1', [req.churchId]);
    const settings = rows[0]?.settings || {};
    settings.fellowship = {
      ...settings.fellowship,
      systemName: systemName || settings.fellowship?.systemName || 'House Fellowship',
      singularTerm: singularTerm || settings.fellowship?.singularTerm || 'Fellowship Center',
      pluralTerm: pluralTerm || settings.fellowship?.pluralTerm || 'Fellowship Centers',
      zoneTerm: zoneTerm || settings.fellowship?.zoneTerm || 'Zone',
      meetingDay: meetingDay || settings.fellowship?.meetingDay || 'Wednesday',
      meetingTime: meetingTime || settings.fellowship?.meetingTime || '18:30',
      defaultCapacity: defaultCapacity ? parseInt(defaultCapacity, 10) : (settings.fellowship?.defaultCapacity || 15),
    };

    await query('UPDATE churches SET settings = $1, updated_at = NOW() WHERE id = $2', [settings, req.churchId]);
    return res.json({ success: true, data: settings.fellowship });
  } catch (err) {
    logger.error('updateFellowshipSettings failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 2. Dashboard & Health Analytics ───────────────────────────
const getFellowshipStats = async (req, res) => {
  try {
    const churchId = req.churchId;

    // Total centers & status breakdown
    const centersRes = await query(
      `SELECT
        COUNT(*) as total_centers,
        COUNT(*) FILTER (WHERE status = 'active') as active_centers,
        COUNT(*) FILTER (WHERE status = 'multiplying') as multiplying_centers
       FROM fellowship_centers WHERE church_id = $1`,
      [churchId]
    );

    // Enrolled members
    const membersRes = await query(
      `SELECT COUNT(DISTINCT member_id) as enrolled_members
       FROM fellowship_members WHERE church_id = $1 AND status = 'active'`,
      [churchId]
    );

    // Unassigned members in church
    const unassignedRes = await query(
      `SELECT COUNT(*) as unassigned_members
       FROM members m
       WHERE m.church_id = $1 AND m.membership_status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM fellowship_members fm
           WHERE fm.member_id = m.id AND fm.church_id = $1 AND fm.status = 'active'
         )`,
      [churchId]
    );

    // 4-week attendance and offerings from reports
    const reportsRes = await query(
      `SELECT
        COALESCE(SUM(total_attendance), 0) as total_attendance,
        COALESCE(AVG(total_attendance), 0) as avg_attendance,
        COALESCE(SUM(offering_amount), 0) as total_offering,
        COUNT(*) as total_reports
       FROM fellowship_meeting_reports
       WHERE church_id = $1 AND meeting_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [churchId]
    );

    // Pending join requests
    const pendingRes = await query(
      `SELECT COUNT(*) as pending_requests
       FROM fellowship_join_requests WHERE church_id = $1 AND status = 'pending'`,
      [churchId]
    );

    return res.json({
      success: true,
      data: {
        totalCenters: parseInt(centersRes.rows[0].total_centers, 10) || 0,
        activeCenters: parseInt(centersRes.rows[0].active_centers, 10) || 0,
        multiplyingCenters: parseInt(centersRes.rows[0].multiplying_centers, 10) || 0,
        enrolledMembers: parseInt(membersRes.rows[0].enrolled_members, 10) || 0,
        unassignedMembers: parseInt(unassignedRes.rows[0].unassigned_members, 10) || 0,
        monthlyAttendance: parseInt(reportsRes.rows[0].total_attendance, 10) || 0,
        avgAttendancePerMeeting: Math.round(parseFloat(reportsRes.rows[0].avg_attendance) || 0),
        monthlyOffering: parseFloat(reportsRes.rows[0].total_offering) || 0,
        pendingJoinRequests: parseInt(pendingRes.rows[0].pending_requests, 10) || 0,
      }
    });
  } catch (err) {
    logger.error('getFellowshipStats failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 3. Zones / Districts ─────────────────────────────────────
const getZones = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT z.*,
              m.first_name || ' ' || m.last_name as coordinator_name,
              m.phone as coordinator_phone,
              (SELECT COUNT(*) FROM fellowship_centers fc WHERE fc.zone_id = z.id AND fc.status != 'inactive') as centers_count
       FROM fellowship_zones z
       LEFT JOIN members m ON m.id = z.coordinator_member_id
       WHERE z.church_id = $1 AND z.is_active = true
       ORDER BY z.name`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getZones failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createZone = async (req, res) => {
  const { name, description, coordinatorMemberId, targetAreas } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Zone name is required' });

  try {
    const areas = Array.isArray(targetAreas)
      ? targetAreas
      : (typeof targetAreas === 'string' ? targetAreas.split(',').map(s => s.trim()).filter(Boolean) : []);

    const { rows } = await query(
      `INSERT INTO fellowship_zones (id, church_id, branch_id, name, description, coordinator_member_id, target_areas)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [uuidv4(), req.churchId, req.branchId || null, name, description || null, coordinatorMemberId || null, areas]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('createZone failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateZone = async (req, res) => {
  const { id } = req.params;
  const { name, description, coordinatorMemberId, targetAreas, isActive } = req.body;

  try {
    const areas = targetAreas !== undefined
      ? (Array.isArray(targetAreas) ? targetAreas : targetAreas.split(',').map(s => s.trim()).filter(Boolean))
      : null;

    const { rows } = await query(
      `UPDATE fellowship_zones SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         coordinator_member_id = $3,
         target_areas = COALESCE($4, target_areas),
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
       WHERE id = $6 AND church_id = $7
       RETURNING *`,
      [name, description, coordinatorMemberId || null, areas, isActive, id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Zone not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('updateZone failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 4. Fellowship Centers ─────────────────────────────────────
const getCenters = async (req, res) => {
  const { zoneId, search, status } = req.query;
  try {
    let conditions = ['fc.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (zoneId) {
      conditions.push(`fc.zone_id = $${idx++}`);
      params.push(zoneId);
    }
    if (status) {
      conditions.push(`fc.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(fc.name ILIKE $${idx} OR fc.code ILIKE $${idx} OR fc.host_address ILIKE $${idx} OR fc.landmark ILIKE $${idx} OR fc.city ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const { rows } = await query(
      `SELECT fc.*,
              fz.name as zone_name,
              lm.first_name || ' ' || lm.last_name as leader_name,
              lm.phone as leader_phone,
              (SELECT COUNT(*) FROM fellowship_members fm WHERE fm.center_id = fc.id AND fm.status = 'active') as member_count,
              (SELECT meeting_date FROM fellowship_meeting_reports mr WHERE mr.center_id = fc.id ORDER BY meeting_date DESC LIMIT 1) as last_meeting_date,
              (SELECT total_attendance FROM fellowship_meeting_reports mr WHERE mr.center_id = fc.id ORDER BY meeting_date DESC LIMIT 1) as last_meeting_attendance
       FROM fellowship_centers fc
       LEFT JOIN fellowship_zones fz ON fz.id = fc.zone_id
       LEFT JOIN members lm ON lm.id = fc.leader_member_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY fc.name`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getCenters failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCenter = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT fc.*,
              fz.name as zone_name,
              lm.first_name || ' ' || lm.last_name as leader_name,
              lm.phone as leader_phone,
              lm.email as leader_email,
              alm.first_name || ' ' || alm.last_name as assistant_leader_name,
              alm.phone as assistant_leader_phone,
              hm.first_name || ' ' || hm.last_name as host_member_name,
              (SELECT COUNT(*) FROM fellowship_members fm WHERE fm.center_id = fc.id AND fm.status = 'active') as member_count
       FROM fellowship_centers fc
       LEFT JOIN fellowship_zones fz ON fz.id = fc.zone_id
       LEFT JOIN members lm ON lm.id = fc.leader_member_id
       LEFT JOIN members alm ON alm.id = fc.assistant_leader_member_id
       LEFT JOIN members hm ON hm.id = fc.host_member_id
       WHERE fc.id = $1 AND fc.church_id = $2`,
      [id, req.churchId]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Center not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getCenter failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createCenter = async (req, res) => {
  const {
    zoneId, name, code, leaderMemberId, assistantLeaderMemberId, hostMemberId,
    hostName, hostPhone, hostAddress, landmark, city, state,
    meetingDay, meetingTime, meetingFrequency, targetAudience, maxCapacity, status, notes
  } = req.body;

  const resolvedAddress = (hostAddress || req.body.host_address || '').trim();
  const centerName = (name || '').trim();

  if (!centerName || !resolvedAddress) {
    return res.status(400).json({ success: false, message: 'Center name and host address are required' });
  }

  const resolvedZoneId = (zoneId || req.body.zone_id || '').trim() || null;
  const resolvedLeaderId = (leaderMemberId || req.body.leader_member_id || '').trim() || null;
  const resolvedAsstLeaderId = (assistantLeaderMemberId || req.body.assistant_leader_member_id || '').trim() || null;
  const resolvedHostMemberId = (hostMemberId || req.body.host_member_id || '').trim() || null;
  const resolvedHostName = (hostName || req.body.host_name || '').trim() || null;
  const resolvedHostPhone = (hostPhone || req.body.host_phone || '').trim() || null;
  const resolvedLandmark = (landmark || '').trim() || null;
  const resolvedCity = (city || '').trim() || null;
  const resolvedState = (state || '').trim() || null;
  const resolvedMeetingDay = meetingDay || req.body.meeting_day || 'Wednesday';
  const resolvedMeetingTime = meetingTime || req.body.meeting_time || '18:30';
  const resolvedFrequency = meetingFrequency || req.body.meeting_frequency || 'weekly';
  const resolvedAudience = targetAudience || req.body.target_audience || 'general';
  const rawCap = maxCapacity || req.body.max_capacity;
  const resolvedCapacity = rawCap ? parseInt(rawCap, 10) : 15;
  const resolvedStatus = status || req.body.status || 'active';
  const resolvedNotes = (notes || '').trim() || null;

  try {
    const id = uuidv4();
    const autoCode = (code || '').trim() || `FC-${Date.now().toString().slice(-4)}`;

    const { rows } = await query(
      `INSERT INTO fellowship_centers (
        id, church_id, branch_id, zone_id, name, code,
        leader_member_id, assistant_leader_member_id, host_member_id,
        host_name, host_phone, host_address, landmark, city, state,
        meeting_day, meeting_time, meeting_frequency, target_audience,
        max_capacity, status, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [
        id, req.churchId, req.branchId || null, resolvedZoneId, centerName, autoCode,
        resolvedLeaderId, resolvedAsstLeaderId, resolvedHostMemberId,
        resolvedHostName, resolvedHostPhone, resolvedAddress, resolvedLandmark, resolvedCity, resolvedState,
        resolvedMeetingDay, resolvedMeetingTime, resolvedFrequency,
        resolvedAudience, resolvedCapacity, resolvedStatus, resolvedNotes
      ]
    );

    // Auto-enroll leader into fellowship_members if specified
    if (resolvedLeaderId) {
      await query(
        `INSERT INTO fellowship_members (id, church_id, center_id, member_id, role)
         VALUES ($1, $2, $3, $4, 'leader')
         ON CONFLICT (center_id, member_id) DO UPDATE SET role = 'leader'`,
        [uuidv4(), req.churchId, id, resolvedLeaderId]
      );
    }

    // Auto-enroll host member if specified and different from leader
    if (resolvedHostMemberId && resolvedHostMemberId !== resolvedLeaderId) {
      await query(
        `INSERT INTO fellowship_members (id, church_id, center_id, member_id, role)
         VALUES ($1, $2, $3, $4, 'host')
         ON CONFLICT (center_id, member_id) DO NOTHING`,
        [uuidv4(), req.churchId, id, resolvedHostMemberId]
      );
    }

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('createCenter failed', { error: err.message, body: req.body });
    return res.status(500).json({ success: false, message: err.message || 'Server error creating center' });
  }
};

const updateCenter = async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  const allowedCols = [
    'zone_id', 'name', 'code', 'leader_member_id', 'assistant_leader_member_id',
    'host_member_id', 'host_name', 'host_phone', 'host_address', 'landmark',
    'city', 'state', 'meeting_day', 'meeting_time', 'meeting_frequency',
    'target_audience', 'max_capacity', 'status', 'notes'
  ];

  const sets = [];
  const params = [];
  let i = 1;

  for (const [key, val] of Object.entries(updates)) {
    const snake = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    if (allowedCols.includes(snake)) {
      sets.push(`${snake} = $${i++}`);
      params.push(val === '' ? null : val);
    }
  }

  if (!sets.length) return res.status(400).json({ success: false, message: 'No editable fields provided' });

  params.push(id, req.churchId);
  try {
    const { rows } = await query(
      `UPDATE fellowship_centers SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${i++} AND church_id = $${i} RETURNING *`,
      params
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Center not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('updateCenter failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 5. Members & Proximity Matching ───────────────────────────
const getCenterMembers = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT m.id, m.member_number, m.first_name, m.last_name, m.phone, m.email,
              m.gender, m.address, m.city, m.profile_photo_url,
              fm.role as fellowship_role, fm.joined_at, fm.status
       FROM fellowship_members fm
       JOIN members m ON m.id = fm.member_id
       WHERE fm.center_id = $1 AND fm.church_id = $2 AND fm.status = 'active'
       ORDER BY CASE WHEN fm.role = 'leader' THEN 1 WHEN fm.role = 'assistant_leader' THEN 2 ELSE 3 END, m.first_name`,
      [id, req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getCenterMembers failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addMemberToCenter = async (req, res) => {
  const { id: centerId } = req.params;
  const { memberId, role = 'member' } = req.body;
  if (!memberId) return res.status(400).json({ success: false, message: 'memberId is required' });

  try {
    const { rows } = await query(
      `INSERT INTO fellowship_members (id, church_id, center_id, member_id, role, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (center_id, member_id) DO UPDATE SET status = 'active', role = $5
       RETURNING *`,
      [uuidv4(), req.churchId, centerId, memberId, role]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('addMemberToCenter failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeMemberFromCenter = async (req, res) => {
  const { id: centerId, memberId } = req.params;
  try {
    await query(
      `UPDATE fellowship_members SET status = 'inactive'
       WHERE center_id = $1 AND member_id = $2 AND church_id = $3`,
      [centerId, memberId, req.churchId]
    );
    return res.json({ success: true, message: 'Member removed from fellowship center' });
  } catch (err) {
    logger.error('removeMemberFromCenter failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUnassignedMembers = async (req, res) => {
  const { search, limit = 50 } = req.query;
  try {
    let conditions = [
      'm.church_id = $1',
      "m.membership_status = 'active'",
      `NOT EXISTS (
         SELECT 1 FROM fellowship_members fm
         WHERE fm.member_id = m.id AND fm.church_id = $1 AND fm.status = 'active'
       )`
    ];
    let params = [req.churchId];
    let idx = 2;

    if (search) {
      conditions.push(`(m.first_name ILIKE $${idx} OR m.last_name ILIKE $${idx} OR m.phone ILIKE $${idx} OR m.address ILIKE $${idx} OR m.city ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    params.push(parseInt(limit, 10));
    const { rows } = await query(
      `SELECT m.id, m.member_number, m.first_name, m.last_name, m.phone, m.email,
              m.address, m.city, m.state, m.gender, m.profile_photo_url
       FROM members m
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.first_name
       LIMIT $${idx}`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getUnassignedMembers failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Intelligent Proximity Matching Algorithm
const matchNearestCenters = async (req, res) => {
  const { memberId, address, city } = req.body;
  try {
    let searchAddress = address || '';
    let searchCity = city || '';

    if (memberId) {
      const memRes = await query(
        'SELECT address, city, state FROM members WHERE id = $1 AND church_id = $2',
        [memberId, req.churchId]
      );
      if (memRes.rows[0]) {
        searchAddress = searchAddress || memRes.rows[0].address || '';
        searchCity = searchCity || memRes.rows[0].city || '';
      }
    }

    if (!searchAddress && !searchCity) {
      return res.status(400).json({ success: false, message: 'Address or City is required for proximity matching' });
    }

    // Fetch all active centers in church with zone areas
    const { rows: centers } = await query(
      `SELECT fc.*,
              fz.name as zone_name,
              fz.target_areas,
              lm.first_name || ' ' || lm.last_name as leader_name,
              lm.phone as leader_phone,
              (SELECT COUNT(*) FROM fellowship_members fm WHERE fm.center_id = fc.id AND fm.status = 'active') as member_count
       FROM fellowship_centers fc
       LEFT JOIN fellowship_zones fz ON fz.id = fc.zone_id
       LEFT JOIN members lm ON lm.id = fc.leader_member_id
       WHERE fc.church_id = $1 AND fc.status != 'inactive'`,
      [req.churchId]
    );

    // Normalize input text into keywords
    const extractTokens = (str) =>
      (str || '').toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'near', 'close', 'street', 'road', 'close', 'avenue', 'str', 'rd'].includes(w));

    const inputTokens = [
      ...extractTokens(searchAddress),
      ...extractTokens(searchCity)
    ];

    const scored = centers.map(center => {
      let score = 0;
      const matchReasons = [];

      const centerText = `${center.name} ${center.host_address} ${center.landmark || ''} ${center.city || ''}`.toLowerCase();
      const centerTokens = extractTokens(centerText);

      // Check direct token overlap
      inputTokens.forEach(token => {
        if (centerTokens.includes(token)) {
          score += 15;
          if (!matchReasons.includes(`Matches location: "${token}"`)) {
            matchReasons.push(`Matches location: "${token}"`);
          }
        } else if (centerText.includes(token)) {
          score += 8;
        }
      });

      // Check Zone target areas
      if (center.target_areas && Array.isArray(center.target_areas)) {
        center.target_areas.forEach(area => {
          const areaLower = area.toLowerCase();
          if (searchAddress.toLowerCase().includes(areaLower) || searchCity.toLowerCase().includes(areaLower)) {
            score += 25;
            matchReasons.push(`In designated zone area: "${area}"`);
          }
        });
      }

      // Check City match
      if (searchCity && center.city && searchCity.toLowerCase() === center.city.toLowerCase()) {
        score += 10;
        matchReasons.push(`Same City: ${center.city}`);
      }

      // Capacity penalty if full
      const isFull = center.member_count >= (center.max_capacity || 15);
      if (isFull) {
        score -= 5;
      }

      return {
        ...center,
        matchScore: Math.min(100, score),
        matchReasons: matchReasons.slice(0, 3),
        isFull,
      };
    });

    // Sort by match score descending
    scored.sort((a, b) => b.matchScore - a.matchScore);

    return res.json({
      success: true,
      data: scored.slice(0, 10),
      matchedAddress: `${searchAddress} ${searchCity}`.trim()
    });
  } catch (err) {
    logger.error('matchNearestCenters failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 6. Weekly Meeting Reports ─────────────────────────────────
const getReports = async (req, res) => {
  const { centerId, startDate, endDate, limit = 50 } = req.query;
  try {
    let conditions = ['mr.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (centerId) {
      conditions.push(`mr.center_id = $${idx++}`);
      params.push(centerId);
    }
    if (startDate) {
      conditions.push(`mr.meeting_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`mr.meeting_date <= $${idx++}`);
      params.push(endDate);
    }

    params.push(parseInt(limit, 10));
    const { rows } = await query(
      `SELECT mr.*,
              fc.name as center_name,
              fc.code as center_code,
              u.first_name || ' ' || u.last_name as submitted_by_user_name,
              m.first_name || ' ' || m.last_name as submitted_by_member_name
       FROM fellowship_meeting_reports mr
       JOIN fellowship_centers fc ON fc.id = mr.center_id
       LEFT JOIN users u ON u.id = mr.submitted_by_user_id
       LEFT JOIN members m ON m.id = mr.submitted_by_member_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY mr.meeting_date DESC, mr.created_at DESC
       LIMIT $${idx}`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getReports failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const submitReport = async (req, res) => {
  const {
    centerId, meetingDate, topic, facilitator,
    attendanceMen = 0, attendanceWomen = 0, attendanceChildren = 0, attendanceFirstTimers = 0,
    offeringAmount = 0, testimonies, prayerRequests, careNotes
  } = req.body;

  if (!centerId || !meetingDate) {
    return res.status(400).json({ success: false, message: 'centerId and meetingDate are required' });
  }

  try {
    const men = parseInt(attendanceMen, 10) || 0;
    const women = parseInt(attendanceWomen, 10) || 0;
    const children = parseInt(attendanceChildren, 10) || 0;
    const firstTimers = parseInt(attendanceFirstTimers, 10) || 0;
    const total = men + women + children + firstTimers;
    const offering = parseFloat(offeringAmount) || 0;

    const { rows } = await query(
      `INSERT INTO fellowship_meeting_reports (
        id, church_id, center_id, meeting_date, topic, facilitator,
        attendance_men, attendance_women, attendance_children, attendance_first_timers,
        total_attendance, offering_amount, testimonies, prayer_requests, care_notes,
        submitted_by_user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        uuidv4(), req.churchId, centerId, meetingDate, topic || null, facilitator || null,
        men, women, children, firstTimers, total, offering,
        testimonies || null, prayerRequests || null, careNotes || null,
        req.user?.id || null
      ]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('submitReport failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 7. Join Requests (from Member Portal) ──────────────────────
const getJoinRequests = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT jr.*,
              fc.name as center_name, fc.host_address,
              m.first_name, m.last_name, m.phone, m.email, m.address as member_address
       FROM fellowship_join_requests jr
       JOIN fellowship_centers fc ON fc.id = jr.center_id
       JOIN members m ON m.id = jr.member_id
       WHERE jr.church_id = $1
       ORDER BY jr.created_at DESC`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getJoinRequests failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const reviewJoinRequest = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' | 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows: reqs } = await client.query(
      `UPDATE fellowship_join_requests
       SET status = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3 AND church_id = $4
       RETURNING *`,
      [status, req.user?.id || null, id, req.churchId]
    );

    if (!reqs[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const joinReq = reqs[0];

    // If approved, insert into fellowship_members
    if (status === 'approved') {
      await client.query(
        `INSERT INTO fellowship_members (id, church_id, center_id, member_id, role, status)
         VALUES ($1, $2, $3, $4, 'member', 'active')
         ON CONFLICT (center_id, member_id) DO UPDATE SET status = 'active'`,
        [uuidv4(), req.churchId, joinReq.center_id, joinReq.member_id]
      );
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: joinReq });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('reviewJoinRequest failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getFellowshipSettings,
  updateFellowshipSettings,
  getFellowshipStats,
  getZones,
  createZone,
  updateZone,
  getCenters,
  getCenter,
  createCenter,
  updateCenter,
  getCenterMembers,
  addMemberToCenter,
  removeMemberFromCenter,
  getUnassignedMembers,
  matchNearestCenters,
  getReports,
  submitReport,
  getJoinRequests,
  reviewJoinRequest,
};
