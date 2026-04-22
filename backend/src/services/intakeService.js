const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const ensureBranchBelongsToChurch = async (churchId, branchId) => {
  if (!branchId) return null;

  const { rows } = await query(
    'SELECT id FROM branches WHERE id = $1 AND church_id = $2 AND is_active = true',
    [branchId, churchId]
  );

  if (!rows[0]) {
    const error = new Error('Selected branch is invalid for this church');
    error.status = 400;
    throw error;
  }

  return branchId;
};

const createFirstTimerRecord = async ({ churchId, data }) => {
  const {
    firstName, lastName, email, phone, address, gender, dateOfBirth,
    howDidYouHear, visitDate, serviceAttended, prayerRequest, branchId
  } = data;

  const safeBranchId = await ensureBranchBelongsToChurch(churchId, branchId || null);

  const { rows } = await query(
    `INSERT INTO first_timers (
      id, church_id, branch_id, first_name, last_name, email, phone, address,
      gender, date_of_birth, how_did_you_hear, visit_date, service_attended, prayer_request
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [
      uuidv4(), churchId, safeBranchId, firstName, lastName, email || null,
      phone || null, address || null, gender || null, dateOfBirth || null,
      howDidYouHear || null, visitDate || new Date(), serviceAttended || null, prayerRequest || null
    ]
  );

  if (prayerRequest && prayerRequest.trim()) {
    await query(
      `INSERT INTO prayer_requests (id, church_id, branch_id, first_timer_id, requester_name, request, category, is_anonymous)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uuidv4(), churchId, safeBranchId, rows[0].id, `${firstName} ${lastName}`, prayerRequest, 'others', false]
    );
  }

  return rows[0];
};

const createMemberRecord = async ({ churchId, data }) => {
  const {
    firstName, lastName, middleName, email, phone, phoneAlt,
    dateOfBirth, gender, maritalStatus, address, city, state, country,
    occupation, employer, membershipClass, joinDate, baptismDate,
    waterBaptized, holyGhostBaptized, salvationDate, branchId,
    nextOfKinName, nextOfKinPhone, nextOfKinRelationship, notes, membershipStatus
  } = data;

  const safeBranchId = await ensureBranchBelongsToChurch(churchId, branchId || null);
  const countRes = await query('SELECT COUNT(*) FROM members WHERE church_id = $1', [churchId]);
  const memberNumber = `MBR-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(5, '0')}`;

  const id = uuidv4();
  const { rows } = await query(
    `INSERT INTO members (
      id, church_id, branch_id, member_number, first_name, last_name, middle_name,
      email, phone, phone_alt, date_of_birth, gender, marital_status, address, city, state, country,
      membership_status,
      occupation, employer, membership_class, join_date, baptism_date,
      water_baptized, holy_ghost_baptized, salvation_date,
      next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
    RETURNING *`,
    [
      id, churchId, safeBranchId, memberNumber, firstName, lastName, middleName || null,
      email || null, phone || null, phoneAlt || null, dateOfBirth || null, gender || null,
      maritalStatus || null, address || null, city || null, state || null, country || null,
      membershipStatus || 'active', occupation || null, employer || null, membershipClass || 'full', joinDate || null, baptismDate || null,
      waterBaptized || false, holyGhostBaptized || false, salvationDate || null,
      nextOfKinName || null, nextOfKinPhone || null, nextOfKinRelationship || null, notes || null
    ]
  );

  return rows[0];
};

module.exports = {
  ensureBranchBelongsToChurch,
  createFirstTimerRecord,
  createMemberRecord,
};