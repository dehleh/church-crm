const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../config/logger');
const { sendSMS, sendWhatsApp } = require('../services/smsService');
const { resolveWriteBranchId, applyBranchFilter } = require('../utils/branchScope');

// Generate 4-digit readable security code (e.g. "K724")
function generateSecurityCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const prefix = letters[Math.floor(Math.random() * letters.length)];
  const digits = String(Math.floor(100 + Math.random() * 900));
  return `${prefix}${digits}`;
}

const checkInChild = async (req, res) => {
  const {
    eventId, childName, childMemberId, classroom, parentName,
    parentPhone, parentMemberId, allergiesMedical, notes, branchId
  } = req.body;

  if (!eventId || !childName || !parentName || !parentPhone) {
    return res.status(400).json({ success: false, message: 'Event, child name, parent name and phone are required' });
  }

  try {
    const finalBranchId = resolveWriteBranchId(req, branchId);
    const securityCode = generateSecurityCode();
    const id = uuidv4();

    const { rows } = await query(
      `INSERT INTO child_check_ins (
        id, church_id, branch_id, event_id, child_member_id, child_name,
        classroom, security_code, parent_member_id, parent_name, parent_phone,
        allergies_medical, notes, checked_in_by, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'checked_in')
      RETURNING *`,
      [
        id, req.churchId, finalBranchId, eventId, childMemberId || null,
        childName.trim(), classroom || 'General', securityCode, parentMemberId || null,
        parentName.trim(), parentPhone.trim(), allergiesMedical || null,
        notes || null, req.user?.id || null
      ]
    );

    logger.info('Child checked in successfully', {
      churchId: req.churchId,
      eventId,
      childName,
      securityCode
    });

    return res.status(201).json({
      success: true,
      data: rows[0],
      securityCode,
      message: `Child checked in. Security claim code: ${securityCode}`
    });
  } catch (err) {
    logger.error('checkInChild error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listChildCheckIns = async (req, res) => {
  const { eventId, status = 'checked_in', classroom, search } = req.query;

  if (!eventId) {
    return res.status(400).json({ success: false, message: 'eventId is required' });
  }

  try {
    const conditions = ['c.church_id = $1', 'c.event_id = $2'];
    const params = [req.churchId, eventId];
    let idx = 3;

    if (status && status !== 'all') {
      conditions.push(`c.status = $${idx++}`);
      params.push(status);
    }
    if (classroom) {
      conditions.push(`c.classroom = $${idx++}`);
      params.push(classroom);
    }
    if (search) {
      conditions.push(`(c.child_name ILIKE $${idx} OR c.parent_name ILIKE $${idx} OR c.security_code ILIKE $${idx} OR c.parent_phone ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    applyBranchFilter(req, 'c.branch_id', conditions, params, idx);

    const { rows } = await query(
      `SELECT c.*,
              e.title as event_title,
              u.first_name || ' ' || u.last_name as checked_in_by_name,
              uo.first_name || ' ' || uo.last_name as checked_out_by_name
       FROM child_check_ins c
       JOIN events e ON e.id = c.event_id
       LEFT JOIN users u ON u.id = c.checked_in_by
       LEFT JOIN users uo ON uo.id = c.checked_out_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.checked_in_at DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('listChildCheckIns error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const checkOutChild = async (req, res) => {
  const { id } = req.params;
  const { securityCode, pickupPersonName } = req.body;

  if (!securityCode) {
    return res.status(400).json({ success: false, message: 'Security code is required to check out child' });
  }

  try {
    const { rows: checkInRows } = await query(
      `SELECT * FROM child_check_ins WHERE id = $1 AND church_id = $2`,
      [id, req.churchId]
    );

    const checkIn = checkInRows[0];
    if (!checkIn) {
      return res.status(404).json({ success: false, message: 'Check-in record not found' });
    }

    if (checkIn.status === 'checked_out') {
      return res.status(400).json({ success: false, message: 'Child is already checked out' });
    }

    const cleanInputCode = String(securityCode).trim().toUpperCase();
    const cleanSavedCode = String(checkIn.security_code).trim().toUpperCase();

    if (cleanInputCode !== cleanSavedCode) {
      logger.warn('Child checkout code mismatch attempt', {
        id,
        entered: cleanInputCode,
        expected: cleanSavedCode
      });
      return res.status(403).json({
        success: false,
        message: 'Security claim code does not match. Pickup denied for child protection.'
      });
    }

    const { rows } = await query(
      `UPDATE child_check_ins
       SET status = 'checked_out',
           checked_out_at = NOW(),
           checked_out_by = $1,
           pickup_person_name = COALESCE($2, parent_name),
           updated_at = NOW()
       WHERE id = $3 AND church_id = $4
       RETURNING *`,
      [req.user?.id || null, pickupPersonName || null, id, req.churchId]
    );

    logger.info('Child securely checked out', {
      id,
      childName: checkIn.child_name,
      checkedOutBy: req.user?.id
    });

    return res.json({
      success: true,
      data: rows[0],
      message: `${checkIn.child_name} has been securely checked out.`
    });
  } catch (err) {
    logger.error('checkOutChild error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const pageParent = async (req, res) => {
  const { id } = req.params;
  const { reason = 'Please attend to your child' } = req.body;

  try {
    const { rows: checkInRows } = await query(
      `SELECT c.*, ch.name as church_name, ch.settings as church_settings
       FROM child_check_ins c
       JOIN churches ch ON ch.id = c.church_id
       WHERE c.id = $1 AND c.church_id = $2`,
      [id, req.churchId]
    );

    const checkIn = checkInRows[0];
    if (!checkIn) {
      return res.status(404).json({ success: false, message: 'Check-in record not found' });
    }

    const churchSettings = checkIn.church_settings?.messaging || {};
    const message = `Hello ${checkIn.parent_name}, this is ${checkIn.church_name} Children's Ministry. Please come to the ${checkIn.classroom} classroom for ${checkIn.child_name} (Code: ${checkIn.security_code}). Note: ${reason}`;

    if (checkIn.parent_phone) {
      await sendWhatsApp({
        to: checkIn.parent_phone,
        body: message,
      }, churchSettings).catch(() => {});

      await sendSMS({
        to: checkIn.parent_phone,
        body: message,
      }, churchSettings).catch(() => {});
    }

    logger.info('Parent paged for child', {
      id,
      childName: checkIn.child_name,
      parentPhone: checkIn.parent_phone
    });

    return res.json({
      success: true,
      message: `Parent of ${checkIn.child_name} has been paged via SMS and WhatsApp.`
    });
  } catch (err) {
    logger.error('pageParent error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error paging parent' });
  }
};

module.exports = {
  checkInChild,
  listChildCheckIns,
  checkOutChild,
  pageParent
};
