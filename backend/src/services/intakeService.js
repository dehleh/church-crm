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

const { autoAssignFellowshipCell } = require('./fellowshipAssignmentService');

const createMemberRecord = async ({ churchId, data, user }) => {
  const {
    firstName, lastName, middleName, email, phone, phoneAlt,
    dateOfBirth, gender, maritalStatus, address, city, state, country,
    occupation, employer, membershipClass, joinDate, baptismDate,
    waterBaptized, holyGhostBaptized, salvationDate, branchId,
    nextOfKinName, nextOfKinPhone, nextOfKinRelationship, notes, membershipStatus,
    hasChildren, childrenCount, teenagersCount, childrenDetails,
    isWorker, workerUnit, workerRole, fellowshipCellId, latitude, longitude,
    designation, leadershipTitle, leadership_title, assignedPastorId, assigned_pastor_id
  } = data;

  const safeBranchId = await ensureBranchBelongsToChurch(churchId, branchId || null);
  const countRes = await query('SELECT COUNT(*) FROM members WHERE church_id = $1', [churchId]);
  const currentMembers = parseInt(countRes.rows[0].count, 10);

  // Check plan member limit from authenticated user context
  const memberLimit = user ? user.member_limit : null;
  const isWhitelisted = user ? Boolean(user.is_whitelisted || user.is_super_admin) : false;
  if (!isWhitelisted && memberLimit != null && currentMembers >= memberLimit) {
    const limitErr = new Error(`Your plan has reached its limit of ${memberLimit} members. Upgrade your plan to add more members.`);
    limitErr.status = 403;
    limitErr.code = 'MEMBER_LIMIT_REACHED';
    throw limitErr;
  }

  const memberNumber = `MBR-${String(currentMembers + 1).padStart(5, '0')}`;

  const cCount = parseInt(childrenCount) || 0;
  const tCount = parseInt(teenagersCount) || 0;
  const userHasChildren = !!(hasChildren || cCount > 0 || tCount > 0);
  const userDesignation = (designation || 'member').toLowerCase().trim();
  const userIsWorker = !!(isWorker || ['pastor', 'director', 'hod', 'minister', 'elder', 'worker'].includes(userDesignation));
  const finalLeadershipTitle = leadershipTitle || leadership_title || null;
  const finalAssignedPastor = assignedPastorId || assigned_pastor_id || null;

  const id = uuidv4();
  const { rows } = await query(
    `INSERT INTO members (
      id, church_id, branch_id, member_number, first_name, last_name, middle_name,
      email, phone, phone_alt, date_of_birth, gender, marital_status, address, city, state, country,
      membership_status,
      occupation, employer, membership_class, join_date, baptism_date,
      water_baptized, holy_ghost_baptized, salvation_date,
      next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, notes,
      has_children, children_count, teenagers_count, children_details,
      is_worker, worker_unit, worker_role, fellowship_cell_id,
      designation, leadership_title, assigned_pastor_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41)
    RETURNING *`,
    [
      id, churchId, safeBranchId, memberNumber, firstName, lastName, middleName || null,
      email || null, phone || null, phoneAlt || null, dateOfBirth || null, gender || null,
      maritalStatus || null, address || null, city || null, state || null, country || null,
      membershipStatus || 'active', occupation || null, employer || null, membershipClass || 'full', joinDate || null, baptismDate || null,
      waterBaptized || false, holyGhostBaptized || false, salvationDate || null,
      nextOfKinName || null, nextOfKinPhone || null, nextOfKinRelationship || null, notes || null,
      userHasChildren, cCount, tCount, childrenDetails || null,
      userIsWorker, workerUnit || null, workerRole || 'worker', fellowshipCellId || null,
      userDesignation, finalLeadershipTitle, finalAssignedPastor
    ]
  );

  const member = rows[0];

  // If worker is in a department, link into member_departments
  if (userIsWorker && workerUnit) {
    try {
      const deptRes = await query(
        `SELECT id FROM departments WHERE church_id = $1 AND (name ILIKE $2 OR id::text = $2) LIMIT 1`,
        [churchId, workerUnit]
      );
      if (deptRes.rows.length) {
        await query(
          `INSERT INTO member_departments (church_id, member_id, department_id, role, is_active)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT DO NOTHING`,
          [churchId, id, deptRes.rows[0].id, workerRole || 'worker']
        );
      }
    } catch (deptErr) {
      logger.warn('Could not auto-link worker department', { error: deptErr.message });
    }
  }

  // Automatic Fellowship / Cell assignment
  let assignedCellInfo = null;
  if (!fellowshipCellId && (address || city || state || (latitude && longitude))) {
    const assignResult = await autoAssignFellowshipCell({
      churchId,
      branchId: safeBranchId,
      memberId: id,
      address,
      city,
      state,
      latitude,
      longitude,
    });
    if (assignResult.assigned) {
      assignedCellInfo = assignResult.center;
      member.fellowship_cell_id = assignResult.center.id;
      member.assigned_cell = assignResult.center;
    }
  } else if (fellowshipCellId) {
    await query(
      `INSERT INTO fellowship_members (id, church_id, center_id, member_id, role, status)
       VALUES ($1, $2, $3, $4, 'member', 'active')
       ON CONFLICT (center_id, member_id) DO NOTHING`,
      [uuidv4(), churchId, fellowshipCellId, id]
    );
  }

  return member;
};

module.exports = {
  ensureBranchBelongsToChurch,
  createFirstTimerRecord,
  createMemberRecord,
};