const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const storageService = require('../services/storageService');
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
      churchSettings: m.church_settings || {},
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
    const [giveRes, evtRes, deptRes, grpRes, prayerRes, churchRes, devRes, discRes, annRes, bdayRes, mediaRes] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(amount), 0) as ytd, COUNT(*) as count
         FROM transactions
         WHERE church_id = $1 AND member_id = $2 AND transaction_type = 'income'
           AND transaction_date >= date_trunc('year', CURRENT_DATE)`,
        [req.churchId, req.member.id]
      ),
      query(
        `SELECT id, title, start_datetime, location, banner_url, is_online, online_link, event_type FROM events
         WHERE church_id = $1 AND start_datetime >= NOW()
           AND status IN ('upcoming','ongoing')
         ORDER BY start_datetime ASC LIMIT 4`,
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
      query(
        `SELECT name, tagline, banner_url, logo_url, mission, vision, pastors, website, phone, email, settings
         FROM churches WHERE id = $1`,
        [req.churchId]
      ),
      query(
        `SELECT id, date, title, theme_scripture, scripture_text, content, confession, prayer_point, author
         FROM daily_devotionals
         WHERE church_id = $1 AND (date = CURRENT_DATE OR date <= CURRENT_DATE) AND is_published = true
         ORDER BY (date = CURRENT_DATE) DESC, date DESC LIMIT 1`,
        [req.churchId]
      ),
      query(
        `SELECT c.id, c.title, c.category, c.level, e.progress_percent, e.status, e.certificate_code,
          COUNT(DISTINCT l.id)::int as total_lessons
         FROM discipleship_enrollments e
         JOIN discipleship_courses c ON c.id = e.course_id
         LEFT JOIN discipleship_lessons l ON l.course_id = c.id
         WHERE e.member_id = $1 AND e.church_id = $2
         GROUP BY c.id, c.title, c.category, c.level, e.progress_percent, e.status, e.certificate_code
         ORDER BY e.updated_at DESC LIMIT 3`,
        [req.member.id, req.churchId]
      ),
      query(
        `SELECT id, title, body, channel, audience, sent_at, created_at
         FROM communications
         WHERE church_id = $1 AND (status = 'sent' OR status = 'scheduled')
           AND (audience = 'all' OR audience = 'members' OR audience IS NULL)
         ORDER BY COALESCE(sent_at, created_at) DESC LIMIT 3`,
        [req.churchId]
      ),
      query(
        `SELECT id, first_name, last_name, profile_photo_url, date_of_birth,
                EXTRACT(DAY FROM date_of_birth)::int as birth_day,
                EXTRACT(MONTH FROM date_of_birth)::int as birth_month,
                (
                  MAKE_DATE(
                    CASE 
                      WHEN (EXTRACT(MONTH FROM date_of_birth) < EXTRACT(MONTH FROM CURRENT_DATE))
                        OR (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM date_of_birth) < EXTRACT(DAY FROM CURRENT_DATE))
                      THEN EXTRACT(YEAR FROM CURRENT_DATE)::int + 1
                      ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int
                    END,
                    EXTRACT(MONTH FROM date_of_birth)::int,
                    CASE 
                      WHEN EXTRACT(MONTH FROM date_of_birth) = 2 AND EXTRACT(DAY FROM date_of_birth) = 29 THEN 28
                      ELSE EXTRACT(DAY FROM date_of_birth)::int
                    END
                  ) - CURRENT_DATE
                )::int as days_until,
                (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)) as is_today
         FROM members
         WHERE church_id = $1 AND date_of_birth IS NOT NULL AND membership_status = 'active'
         ORDER BY days_until ASC LIMIT 6`,
        [req.churchId]
      ),
      query(
        `SELECT id, title, media_type, file_url, thumbnail_url, duration_seconds, minister_name, series_name, created_at
         FROM media_items
         WHERE church_id = $1 AND is_published = true
         ORDER BY created_at DESC LIMIT 3`,
        [req.churchId]
      )
    ]);
    return res.json({
      success: true,
      data: {
        church: churchRes.rows[0],
        givingYtd: giveRes.rows[0],
        upcomingEvents: evtRes.rows,
        departments: deptRes.rows,
        groups: grpRes.rows,
        openPrayers: prayerRes.rows[0]?.open || 0,
        todayDevotional: devRes.rows[0] || null,
        activeCourses: discRes.rows,
        announcements: annRes.rows,
        upcomingBirthdays: bdayRes.rows,
        recentMedia: mediaRes.rows,
      },
    });
  } catch (err) {
    logger.error('getHome error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/avatar (multipart "avatar")
const uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  try {
    let url;
    if (storageService.isS3Configured) {
      const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
      const uploaded = await storageService.uploadFile({
        buffer: fileBuffer,
        filename: req.file.originalname || req.file.filename,
        mimetype: req.file.mimetype,
        folder: 'avatars',
      });
      url = uploaded.url;
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } else {
      url = `/uploads/avatars/${req.file.filename}`;
    }

    // Clean up previous avatar if it exists
    if (req.member.profile_photo_url) {
      storageService.deleteFile(req.member.profile_photo_url).catch(() => {});
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

// GET /api/me/fellowship
const getMyFellowship = async (req, res) => {
  try {
    const memberId = req.member.id;
    const churchId = req.churchId;

    // Get church fellowship terminology
    const churchRes = await query('SELECT settings FROM churches WHERE id = $1', [churchId]);
    const terms = churchRes.rows[0]?.settings?.fellowship || {
      systemName: 'House Fellowship',
      singularTerm: 'Fellowship Center',
      pluralTerm: 'Fellowship Centers',
      zoneTerm: 'Zone',
    };

    // Check if member is enrolled in a fellowship center
    const { rows: membership } = await query(
      `SELECT fm.role as member_role, fm.joined_at,
              fc.id, fc.name, fc.code, fc.host_name, fc.host_phone, fc.host_address,
              fc.landmark, fc.city, fc.state, fc.meeting_day, fc.meeting_time,
              fc.meeting_frequency, fc.target_audience, fc.max_capacity,
              fz.name as zone_name,
              lm.first_name || ' ' || lm.last_name as leader_name,
              lm.phone as leader_phone,
              lm.email as leader_email,
              alm.first_name || ' ' || alm.last_name as assistant_leader_name,
              alm.phone as assistant_leader_phone
       FROM fellowship_members fm
       JOIN fellowship_centers fc ON fc.id = fm.center_id
       LEFT JOIN fellowship_zones fz ON fz.id = fc.zone_id
       LEFT JOIN members lm ON lm.id = fc.leader_member_id
       LEFT JOIN members alm ON alm.id = fc.assistant_leader_member_id
       WHERE fm.member_id = $1 AND fm.church_id = $2 AND fm.status = 'active'`,
      [memberId, churchId]
    );

    if (!membership[0]) {
      // Check pending join request
      const { rows: pendingReq } = await query(
        `SELECT jr.*, fc.name as center_name, fc.host_address
         FROM fellowship_join_requests jr
         JOIN fellowship_centers fc ON fc.id = jr.center_id
         WHERE jr.member_id = $1 AND jr.church_id = $2 AND jr.status = 'pending'`,
        [memberId, churchId]
      );

      return res.json({
        success: true,
        data: {
          enrolled: false,
          terms,
          pendingRequest: pendingReq[0] || null,
        }
      });
    }

    const center = membership[0];

    // Fetch fellow members of this center
    const { rows: members } = await query(
      `SELECT m.id, m.first_name, m.last_name, m.profile_photo_url, m.phone,
              fm.role as fellowship_role
       FROM fellowship_members fm
       JOIN members m ON m.id = fm.member_id
       WHERE fm.center_id = $1 AND fm.church_id = $2 AND fm.status = 'active'
       ORDER BY CASE WHEN fm.role = 'leader' THEN 1 WHEN fm.role = 'assistant_leader' THEN 2 ELSE 3 END, m.first_name`,
      [center.id, churchId]
    );

    // Fetch recent reports if leader
    const isLeader = ['leader', 'assistant_leader', 'host'].includes(center.member_role);
    let recentReports = [];
    if (isLeader) {
      const { rows: rpts } = await query(
        `SELECT * FROM fellowship_meeting_reports
         WHERE center_id = $1 AND church_id = $2
         ORDER BY meeting_date DESC LIMIT 5`,
        [center.id, churchId]
      );
      recentReports = rpts;
    }

    return res.json({
      success: true,
      data: {
        enrolled: true,
        terms,
        center,
        members,
        isLeader,
        recentReports,
      }
    });
  } catch (err) {
    logger.error('getMyFellowship failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/fellowship/browse
const browseNearbyFellowships = async (req, res) => {
  try {
    const memberId = req.member.id;
    const churchId = req.churchId;

    // Get member's address
    const { rows: memRows } = await query('SELECT address, city, state FROM members WHERE id = $1', [memberId]);
    const mem = memRows[0] || {};
    const memAddress = `${mem.address || ''} ${mem.city || ''}`.toLowerCase();

    // Fetch active centers
    const { rows: centers } = await query(
      `SELECT fc.id, fc.name, fc.code, fc.host_address, fc.landmark, fc.city,
              fc.meeting_day, fc.meeting_time, fc.meeting_frequency, fc.target_audience,
              fc.max_capacity,
              fz.name as zone_name, fz.target_areas,
              lm.first_name || ' ' || lm.last_name as leader_name,
              lm.phone as leader_phone,
              (SELECT COUNT(*) FROM fellowship_members fm WHERE fm.center_id = fc.id AND fm.status = 'active') as member_count
       FROM fellowship_centers fc
       LEFT JOIN fellowship_zones fz ON fz.id = fc.zone_id
       LEFT JOIN members lm ON lm.id = fc.leader_member_id
       WHERE fc.church_id = $1 AND fc.status != 'inactive'
       ORDER BY fc.name`,
      [churchId]
    );

    // Simple proximity scoring
    const extractTokens = (str) =>
      (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'near', 'street', 'road', 'close'].includes(w));

    const memTokens = extractTokens(memAddress);

    const scored = centers.map(c => {
      let score = 0;
      const reasons = [];
      const cTokens = extractTokens(`${c.name} ${c.host_address} ${c.landmark || ''} ${c.city || ''}`);

      memTokens.forEach(t => {
        if (cTokens.includes(t)) {
          score += 15;
          if (!reasons.includes(`Area match: "${t}"`)) reasons.push(`Area match: "${t}"`);
        }
      });

      if (c.target_areas && Array.isArray(c.target_areas)) {
        c.target_areas.forEach(area => {
          if (memAddress.includes(area.toLowerCase())) {
            score += 25;
            reasons.push(`Designated area: "${area}"`);
          }
        });
      }

      if (mem.city && c.city && mem.city.toLowerCase() === c.city.toLowerCase()) {
        score += 10;
        reasons.push(`Same city: ${c.city}`);
      }

      return {
        ...c,
        matchScore: Math.min(100, score),
        matchReasons: reasons.slice(0, 2),
        isFull: c.member_count >= (c.max_capacity || 15),
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ success: true, data: scored });
  } catch (err) {
    logger.error('browseNearbyFellowships failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/fellowship/join
const submitFellowshipJoinRequest = async (req, res) => {
  const { centerId, note } = req.body;
  if (!centerId) return res.status(400).json({ success: false, message: 'centerId is required' });

  try {
    const memberId = req.member.id;
    const churchId = req.churchId;

    // Check if already in this center or has pending request
    const existing = await query(
      'SELECT id, status FROM fellowship_join_requests WHERE center_id = $1 AND member_id = $2',
      [centerId, memberId]
    );

    if (existing.rows[0] && existing.rows[0].status === 'pending') {
      return res.status(409).json({ success: false, message: 'You already have a pending join request for this fellowship center' });
    }

    const { rows } = await query(
      `INSERT INTO fellowship_join_requests (id, church_id, center_id, member_id, request_note, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [uuidv4(), churchId, centerId, memberId, note || null]
    );

    return res.status(201).json({ success: true, data: rows[0], message: 'Join request submitted. The fellowship leader will be in touch.' });
  } catch (err) {
    logger.error('submitFellowshipJoinRequest failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/fellowship/reports (Leader weekly submission from portal)
const submitMemberCellReport = async (req, res) => {
  const {
    meetingDate, topic, facilitator,
    attendanceMen = 0, attendanceWomen = 0, attendanceChildren = 0, attendanceFirstTimers = 0,
    offeringAmount = 0, testimonies, prayerRequests, careNotes
  } = req.body;

  try {
    const memberId = req.member.id;
    const churchId = req.churchId;

    // Check if member is a leader of their cell
    const { rows: memCell } = await query(
      `SELECT center_id, role FROM fellowship_members
       WHERE member_id = $1 AND church_id = $2 AND status = 'active'
         AND role IN ('leader', 'assistant_leader', 'host')`,
      [memberId, churchId]
    );

    if (!memCell[0]) {
      return res.status(403).json({ success: false, message: 'Only fellowship leaders can submit meeting reports' });
    }

    const centerId = memCell[0].center_id;
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
        submitted_by_member_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        uuidv4(), churchId, centerId, meetingDate, topic || null, facilitator || null,
        men, women, children, firstTimers, total, offering,
        testimonies || null, prayerRequests || null, careNotes || null,
        memberId
      ]
    );

    return res.status(201).json({ success: true, data: rows[0], message: 'Fellowship meeting report submitted!' });
  } catch (err) {
    logger.error('submitMemberCellReport failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DAILY DEVOTIONALS FOR MEMBERS ───────────────────────────

// GET /api/me/devotionals/today
const getTodayDevotional = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.*
       FROM daily_devotionals d
       WHERE d.church_id = $1 AND d.date = CURRENT_DATE AND d.is_published = true
       LIMIT 1`,
      [req.churchId]
    );

    // If no devotional for today, fetch the most recent published one
    if (!rows[0]) {
      const { rows: fallback } = await query(
        `SELECT d.* FROM daily_devotionals d
         WHERE d.church_id = $1 AND d.is_published = true
         ORDER BY d.date DESC LIMIT 1`,
        [req.churchId]
      );
      return res.json({ success: true, data: fallback[0] || null });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getTodayDevotional error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/devotionals
const listDevotionals = async (req, res) => {
  const { month, year, limit = 31 } = req.query;
  try {
    let conditions = ['d.church_id = $1', 'd.is_published = true'];
    let params = [req.churchId];
    let idx = 2;

    if (month) {
      conditions.push(`EXTRACT(MONTH FROM d.date) = $${idx++}`);
      params.push(parseInt(month));
    }
    if (year) {
      conditions.push(`EXTRACT(YEAR FROM d.date) = $${idx++}`);
      params.push(parseInt(year));
    }

    const { rows } = await query(
      `SELECT d.id, d.date, d.title, d.theme_scripture, d.author, d.created_at
       FROM daily_devotionals d
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.date DESC
       LIMIT $${idx}`,
      [...params, parseInt(limit)]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('listDevotionals error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/devotionals/:date
const getDevotionalByDate = async (req, res) => {
  const { date } = req.params;
  try {
    const { rows } = await query(
      `SELECT d.* FROM daily_devotionals d
       WHERE d.church_id = $1 AND d.date = $2 AND d.is_published = true
       LIMIT 1`,
      [req.churchId, date]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Devotional not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getDevotionalByDate error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DISCIPLESHIP TRAINING FOR MEMBERS ────────────────────────

// GET /api/me/discipleship/courses
const listMyDiscipleshipCourses = async (req, res) => {
  try {
    // 1. All published courses for this church
    const { rows: courses } = await query(
      `SELECT c.*,
        COUNT(DISTINCT l.id)::int as lesson_count,
        e.id as enrollment_id,
        e.status as enrollment_status,
        e.progress_percent,
        e.enrolled_at,
        e.completed_at,
        e.certificate_code
       FROM discipleship_courses c
       LEFT JOIN discipleship_lessons l ON l.course_id = c.id
       LEFT JOIN discipleship_enrollments e ON e.course_id = c.id AND e.member_id = $2
       WHERE c.church_id = $1 AND c.is_published = true
       GROUP BY c.id, e.id, e.status, e.progress_percent, e.enrolled_at, e.completed_at, e.certificate_code
       ORDER BY e.status IS NOT NULL DESC, c.created_at DESC`,
      [req.churchId, req.member.id]
    );

    return res.json({ success: true, data: courses });
  } catch (err) {
    logger.error('listMyDiscipleshipCourses error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/discipleship/courses/:id
const getMyDiscipleshipCourseDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: courseRows } = await query(
      `SELECT c.*,
        e.id as enrollment_id,
        e.status as enrollment_status,
        e.progress_percent,
        e.enrolled_at,
        e.completed_at,
        e.certificate_code
       FROM discipleship_courses c
       LEFT JOIN discipleship_enrollments e ON e.course_id = c.id AND e.member_id = $2
       WHERE c.id = $1 AND c.church_id = $3 AND c.is_published = true`,
      [id, req.member.id, req.churchId]
    );

    if (!courseRows[0]) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const enrollmentId = courseRows[0].enrollment_id;

    const { rows: lessons } = await query(
      `SELECT l.*,
        COALESCE(p.is_completed, false) as is_completed,
        p.completed_at,
        p.reflection_notes
       FROM discipleship_lessons l
       LEFT JOIN discipleship_lesson_progress p ON p.lesson_id = l.id AND p.member_id = $2
       WHERE l.course_id = $1 AND l.church_id = $3
       ORDER BY l.order_num ASC, l.created_at ASC`,
      [id, req.member.id, req.churchId]
    );

    return res.json({
      success: true,
      data: {
        ...courseRows[0],
        lessons
      }
    });
  } catch (err) {
    logger.error('getMyDiscipleshipCourseDetails error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/discipleship/courses/:id/enroll
const enrollInDiscipleshipCourse = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `INSERT INTO discipleship_enrollments (
        church_id, course_id, member_id, status, progress_percent
      ) VALUES ($1, $2, $3, 'in_progress', 0)
      ON CONFLICT (course_id, member_id) DO UPDATE SET
        status = 'in_progress',
        updated_at = NOW()
      RETURNING *`,
      [req.churchId, id, req.member.id]
    );

    return res.status(201).json({
      success: true,
      data: rows[0],
      message: 'Enrolled in discipleship course successfully!'
    });
  } catch (err) {
    logger.error('enrollInDiscipleshipCourse error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/discipleship/lessons/:lessonId/complete
const completeLessonProgress = async (req, res) => {
  const { lessonId } = req.params;
  const { reflectionNotes } = req.body;

  try {
    // 1. Find lesson and course
    const { rows: lessonRows } = await query(
      `SELECT l.*, c.id as course_id
       FROM discipleship_lessons l
       JOIN discipleship_courses c ON c.id = l.course_id
       WHERE l.id = $1 AND l.church_id = $2`,
      [lessonId, req.churchId]
    );

    if (!lessonRows[0]) return res.status(404).json({ success: false, message: 'Lesson not found' });
    const courseId = lessonRows[0].course_id;

    // 2. Ensure member is enrolled
    let { rows: enrollRows } = await query(
      `SELECT * FROM discipleship_enrollments WHERE course_id = $1 AND member_id = $2`,
      [courseId, req.member.id]
    );

    let enrollmentId;
    if (!enrollRows[0]) {
      const { rows: newEnroll } = await query(
        `INSERT INTO discipleship_enrollments (church_id, course_id, member_id, status, progress_percent)
         VALUES ($1, $2, $3, 'in_progress', 0) RETURNING *`,
        [req.churchId, courseId, req.member.id]
      );
      enrollmentId = newEnroll[0].id;
    } else {
      enrollmentId = enrollRows[0].id;
    }

    // 3. Mark lesson completed
    await query(
      `INSERT INTO discipleship_lesson_progress (
        church_id, enrollment_id, lesson_id, member_id, is_completed, reflection_notes, completed_at
      ) VALUES ($1, $2, $3, $4, true, $5, NOW())
      ON CONFLICT (enrollment_id, lesson_id) DO UPDATE SET
        is_completed = true,
        reflection_notes = COALESCE($5, discipleship_lesson_progress.reflection_notes),
        completed_at = NOW()`,
      [req.churchId, enrollmentId, lessonId, req.member.id, reflectionNotes || null]
    );

    // 4. Calculate total progress percent
    const { rows: totalLessons } = await query(
      `SELECT COUNT(*)::int as total FROM discipleship_lessons WHERE course_id = $1`,
      [courseId]
    );
    const { rows: completedLessons } = await query(
      `SELECT COUNT(*)::int as completed FROM discipleship_lesson_progress
       WHERE enrollment_id = $1 AND is_completed = true`,
      [enrollmentId]
    );

    const total = totalLessons[0].total || 1;
    const completed = completedLessons[0].completed || 0;
    const percent = Math.min(100, Math.round((completed / total) * 100));
    const isFinished = percent === 100;

    let certCode = null;
    if (isFinished) {
      certCode = `CERT-DISC-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    await query(
      `UPDATE discipleship_enrollments SET
        progress_percent = $1,
        status = CASE WHEN $1 = 100 THEN 'completed' ELSE 'in_progress' END,
        completed_at = CASE WHEN $1 = 100 THEN NOW() ELSE completed_at END,
        certificate_code = COALESCE($2, certificate_code),
        updated_at = NOW()
       WHERE id = $3`,
      [percent, certCode, enrollmentId]
    );

    return res.json({
      success: true,
      data: {
        progressPercent: percent,
        isCompleted: isFinished,
        certificateCode: certCode
      },
      message: isFinished ? '🎉 Congratulations! You have completed this discipleship course!' : 'Lesson marked as complete!'
    });
  } catch (err) {
    logger.error('completeLessonProgress error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/export — GDPR / NDPR compliant member data export
const exportMemberData = async (req, res) => {
  try {
    const memberId = req.member.id;

    const [memberRes, attendanceRes, givingRes, prayerRes, courseRes] = await Promise.all([
      query('SELECT * FROM members WHERE id = $1', [memberId]),
      query(
        `SELECT a.*, e.title as event_title, e.event_date
         FROM attendance a
         JOIN events e ON e.id = a.event_id
         WHERE a.member_id = $1
         ORDER BY e.event_date DESC`,
        [memberId]
      ),
      query(
        'SELECT * FROM online_giving_transactions WHERE member_id = $1 ORDER BY created_at DESC',
        [memberId]
      ),
      query(
        'SELECT id, title, request, status, created_at FROM prayer_requests WHERE member_id = $1 ORDER BY created_at DESC',
        [memberId]
      ),
      query(
        `SELECT de.*, dc.title as course_title
         FROM discipleship_enrollments de
         JOIN discipleship_courses dc ON dc.id = de.course_id
         WHERE de.member_id = $1`,
        [memberId]
      ),
    ]);

    const archive = {
      exportedAt: new Date().toISOString(),
      member: memberRes.rows[0],
      attendance: attendanceRes.rows,
      onlineGiving: givingRes.rows,
      prayerRequests: prayerRes.rows,
      discipleshipEnrollments: courseRes.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="member-archive-${memberId}.json"`);
    return res.json({ success: true, data: archive });
  } catch (err) {
    logger.error('exportMemberData error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Data export failed' });
  }
};

// GET /api/me/birthdays — birthdays of church members
const getBirthdays = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, first_name, last_name, profile_photo_url, date_of_birth,
              EXTRACT(DAY FROM date_of_birth)::int as birth_day,
              EXTRACT(MONTH FROM date_of_birth)::int as birth_month,
              (
                MAKE_DATE(
                  CASE 
                    WHEN (EXTRACT(MONTH FROM date_of_birth) < EXTRACT(MONTH FROM CURRENT_DATE))
                      OR (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM date_of_birth) < EXTRACT(DAY FROM CURRENT_DATE))
                    THEN EXTRACT(YEAR FROM CURRENT_DATE)::int + 1
                    ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int
                  END,
                  EXTRACT(MONTH FROM date_of_birth)::int,
                  CASE 
                    WHEN EXTRACT(MONTH FROM date_of_birth) = 2 AND EXTRACT(DAY FROM date_of_birth) = 29 THEN 28
                    ELSE EXTRACT(DAY FROM date_of_birth)::int
                  END
                ) - CURRENT_DATE
              )::int as days_until,
              (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)) as is_today
       FROM members
       WHERE church_id = $1 AND date_of_birth IS NOT NULL AND membership_status = 'active'
       ORDER BY days_until ASC
       LIMIT 60`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('member getBirthdays failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/announcements — church announcements & broadcast messages
const getAnnouncements = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, body, channel, audience, sent_at, created_at
       FROM communications
       WHERE church_id = $1 AND (status = 'sent' OR status = 'scheduled')
         AND (audience = 'all' OR audience = 'members' OR audience IS NULL)
       ORDER BY COALESCE(sent_at, created_at) DESC
       LIMIT 50`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('member getAnnouncements failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/media — access to published sermons, audio, videos
const getMediaItems = async (req, res) => {
  const { type, search } = req.query;
  try {
    let conditions = ['mi.church_id = $1', 'mi.is_published = true'];
    let params = [req.churchId];
    let idx = 2;
    if (type) { conditions.push(`mi.media_type = $${idx++}`); params.push(type); }
    if (search) {
      conditions.push(`(mi.title ILIKE $${idx} OR mi.minister_name ILIKE $${idx} OR mi.series_name ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    const where = conditions.join(' AND ');
    const { rows } = await query(
      `SELECT mi.*
       FROM media_items mi
       WHERE ${where}
       ORDER BY mi.created_at DESC
       LIMIT 60`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('member getMediaItems failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/media/:id
const getMediaItem = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT mi.* FROM media_items mi WHERE mi.id = $1 AND mi.church_id = $2 AND mi.is_published = true`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Media not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('member getMediaItem failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/me/giving/options — categories for offering, projects, events, campaigns
const getGivingOptions = async (req, res) => {
  try {
    const [catRes, churchRes, evtRes, campRes] = await Promise.all([
      query('SELECT id, name, description FROM giving_categories WHERE church_id = $1 ORDER BY name ASC', [req.churchId]),
      query('SELECT currency, settings FROM churches WHERE id = $1', [req.churchId]),
      query("SELECT id, title, start_datetime FROM events WHERE church_id = $1 AND status IN ('upcoming', 'ongoing') ORDER BY start_datetime ASC LIMIT 10", [req.churchId]),
      query(
        `SELECT
          c.id, c.title, c.slug, c.type, c.description, c.scripture_text,
          c.target_amount, c.currency, c.banner_url, c.end_date, c.is_featured,
          COALESCE((
            SELECT SUM(t.amount) FROM transactions t
            WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
          ), 0) + COALESCE((
            SELECT SUM(og.amount) FROM online_giving_transactions og
            WHERE og.campaign_id = c.id AND og.status = 'successful'
          ), 0) AS amount_raised
         FROM giving_campaigns c
         WHERE c.church_id = $1 AND c.status = 'active' AND c.allow_member_portal = true
         ORDER BY c.is_featured DESC, c.created_at DESC`,
        [req.churchId]
      ).catch(() => ({ rows: [] }))
    ]);
    const church = churchRes.rows[0];
    const settings = church?.settings || {};
    const formattedCampaigns = (campRes?.rows || []).map(c => {
      const target = Number(c.target_amount || 0);
      const raised = Number(c.amount_raised || 0);
      return {
        ...c,
        target_amount: target,
        amount_raised: raised,
        progress_percent: target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0,
      };
    });

    return res.json({
      success: true,
      data: {
        categories: catRes.rows,
        events: evtRes.rows,
        campaigns: formattedCampaigns,
        currency: church?.currency || 'NGN',
        bankAccounts: settings.bank_accounts || settings.bankAccounts || [],
        paystackPublicKey: settings.payment?.paystack_public_key || process.env.PAYSTACK_PUBLIC_KEY || '',
      }
    });
  } catch (err) {
    logger.error('member getGivingOptions failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/me/giving/initiate — give for offering, projects, events, campaigns
const initiatePortalGiving = async (req, res) => {
  const { amount, categoryId, campaignId, purpose, eventId, paymentMethod = 'paystack', notes, reference: clientRef } = req.body;
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amount is required' });
  }
  try {
    const member = req.member;
    const ref = clientRef || `GIV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const desc = purpose ? `${purpose}${notes ? ` - ${notes}` : ''}` : `Giving contribution (${member.first_name} ${member.last_name})`;

    const { rows } = await query(
      `INSERT INTO transactions (
         id, church_id, member_id, category_id, campaign_id, event_id, transaction_type,
         amount, payment_method, reference, description, status, transaction_date
       ) VALUES ($1, $2, $3, $4, $5, $6, 'income', $7, $8, $9, $10, 'completed', CURRENT_DATE)
       RETURNING *`,
      [
        uuidv4(),
        req.churchId,
        member.id,
        categoryId || null,
        campaignId || null,
        eventId || null,
        Number(amount),
        paymentMethod,
        ref,
        desc
      ]
    );

    try {
      await query(
        `INSERT INTO online_giving_transactions (
           id, church_id, member_id, amount, currency, category_id,
           giving_type, reference, status, donor_name, donor_email, donor_phone
         ) VALUES ($1, $2, $3, $4, 'NGN', $5, $6, $7, 'success', $8, $9, $10)
         ON CONFLICT (reference) DO NOTHING`,
        [
          uuidv4(), req.churchId, member.id, Number(amount), categoryId || null,
          purpose || 'offering', ref,
          `${member.first_name} ${member.last_name}`, member.email, member.phone
        ]
      );
    } catch {}

    return res.json({
      success: true,
      message: 'Giving recorded successfully! Thank you for supporting God’s work.',
      data: rows[0]
    });
  } catch (err) {
    logger.error('member initiatePortalGiving failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to record giving' });
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
  getMyFellowship,
  browseNearbyFellowships,
  submitFellowshipJoinRequest,
  submitMemberCellReport,
  getTodayDevotional,
  listDevotionals,
  getDevotionalByDate,
  listMyDiscipleshipCourses,
  getMyDiscipleshipCourseDetails,
  enrollInDiscipleshipCourse,
  completeLessonProgress,
  exportMemberData,
  getBirthdays,
  getAnnouncements,
  getMediaItems,
  getMediaItem,
  getGivingOptions,
  initiatePortalGiving,
};


