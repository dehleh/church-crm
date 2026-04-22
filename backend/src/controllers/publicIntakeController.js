const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { createFirstTimerRecord, createMemberRecord, ensureBranchBelongsToChurch } = require('../services/intakeService');

const getChurchBySlug = async (slug) => {
  const { rows } = await query(
    `SELECT id, name, slug, logo_url, city, state, country, is_active
     FROM churches
     WHERE slug = $1`,
    [slug]
  );

  if (!rows[0] || !rows[0].is_active) {
    return null;
  }

  return rows[0];
};

const getIntakeContext = async (req, res) => {
  try {
    const church = await getChurchBySlug(req.params.slug);
    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const { rows: branches } = await query(
      `SELECT id, name, is_headquarters
       FROM branches
       WHERE church_id = $1 AND is_active = true
       ORDER BY is_headquarters DESC, name ASC`,
      [church.id]
    );

    const { rows: welfarePackages } = await query(
      `SELECT id, name, description, package_type
       FROM welfare_packages
       WHERE church_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [church.id]
    );

    return res.json({
      success: true,
      data: {
        church: {
          name: church.name,
          slug: church.slug,
          logoUrl: church.logo_url,
          city: church.city,
          state: church.state,
          country: church.country,
        },
        branches,
        welfarePackages,
      }
    });
  } catch (err) {
    logger.error('getIntakeContext error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const submitFirstTimer = async (req, res) => {
  try {
    const church = await getChurchBySlug(req.params.slug);
    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const record = await createFirstTimerRecord({ churchId: church.id, data: req.body });
    return res.status(201).json({
      success: true,
      message: 'Thank you. Your details have been received.',
      data: record,
    });
  } catch (err) {
    logger.error('submitFirstTimer error', { error: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error' });
  }
};

const submitMember = async (req, res) => {
  try {
    const church = await getChurchBySlug(req.params.slug);
    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const record = await createMemberRecord({
      churchId: church.id,
      data: { ...req.body, membershipStatus: 'pending_review' }
    });
    return res.status(201).json({
      success: true,
      message: 'Thank you. Your membership form has been submitted for review.',
      data: record,
    });
  } catch (err) {
    logger.error('submitMember error', { error: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error' });
  }
};

const submitPrayerRequest = async (req, res) => {
  try {
    const church = await getChurchBySlug(req.params.slug);
    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const branchId = await ensureBranchBelongsToChurch(church.id, req.body.branchId || null);
    const { rows } = await query(
      `INSERT INTO prayer_requests (id, church_id, branch_id, requester_name, request, category, is_anonymous)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        uuidv4(), church.id, branchId, req.body.requesterName || null,
        req.body.request, req.body.category || 'others', req.body.isAnonymous || false
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Prayer request received.',
      data: rows[0],
    });
  } catch (err) {
    logger.error('submitPrayerRequest error', { error: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error' });
  }
};

const submitWelfareApplication = async (req, res) => {
  try {
    const church = await getChurchBySlug(req.params.slug);
    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const { rows: packageRows } = await query(
      `SELECT id, name
       FROM welfare_packages
       WHERE id = $1 AND church_id = $2 AND is_active = true`,
      [req.body.packageId, church.id]
    );
    const welfarePackage = packageRows[0];
    if (!welfarePackage) {
      return res.status(404).json({ success: false, message: 'Welfare package not found' });
    }

    const { rows } = await query(
      `INSERT INTO welfare_applications (
        id, church_id, package_id, applicant_name, reason, amount_requested
      ) VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        uuidv4(),
        church.id,
        welfarePackage.id,
        req.body.applicantName,
        req.body.reason,
        req.body.amountRequested || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Your welfare application for ${welfarePackage.name} has been submitted.`,
      data: rows[0],
    });
  } catch (err) {
    logger.error('submitWelfareApplication error', { error: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error' });
  }
};

const getEventCheckInContext = async (req, res) => {
  try {
    const church = await getChurchBySlug(req.params.slug);
    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const { rows } = await query(
      `SELECT e.id, e.title, e.description, e.event_type, e.start_datetime, e.end_datetime,
              e.location, e.is_online, e.online_link, e.status, b.name as branch_name
       FROM events e
       LEFT JOIN branches b ON b.id = e.branch_id
       WHERE e.id = $1 AND e.church_id = $2`,
      [req.params.eventId, church.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.json({
      success: true,
      data: {
        church: {
          name: church.name,
          slug: church.slug,
          logoUrl: church.logo_url,
          city: church.city,
          state: church.state,
          country: church.country,
        },
        event: rows[0],
      },
    });
  } catch (err) {
    logger.error('getEventCheckInContext error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const submitEventCheckIn = async (req, res) => {
  try {
    const church = await getChurchBySlug(req.params.slug);
    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const { rows: eventRows } = await query(
      'SELECT id, title, status FROM events WHERE id = $1 AND church_id = $2',
      [req.params.eventId, church.id]
    );
    const event = eventRows[0];
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const memberNumber = req.body.memberNumber?.trim();
    const phone = req.body.phone?.trim();
    const { rows: memberRows } = await query(
      `SELECT id, first_name, last_name
       FROM members
       WHERE church_id = $1 AND member_number = $2 AND (phone = $3 OR phone_alt = $3)`,
      [church.id, memberNumber, phone]
    );
    const member = memberRows[0];
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found. Check member ID and phone number.' });
    }

    const attendanceId = uuidv4();
    const { rows: inserted } = await query(
      `INSERT INTO attendance (id, church_id, event_id, member_id, check_in_method)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (event_id, member_id) DO NOTHING
       RETURNING *`,
      [attendanceId, church.id, event.id, member.id, 'qr']
    );

    await query(
      `UPDATE events SET actual_attendance = (
        SELECT COUNT(*) FROM attendance WHERE event_id = $1
      ) WHERE id = $1`,
      [event.id]
    );

    if (!inserted[0]) {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        message: `${member.first_name} ${member.last_name} is already checked in.`,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Welcome, ${member.first_name}. Your attendance has been recorded for ${event.title}.`,
      data: inserted[0],
    });
  } catch (err) {
    logger.error('submitEventCheckIn error', { error: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error' });
  }
};

module.exports = {
  getIntakeContext,
  getEventCheckInContext,
  submitFirstTimer,
  submitMember,
  submitPrayerRequest,
  submitWelfareApplication,
  submitEventCheckIn,
};