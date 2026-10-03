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

  // Trigger automated WhatsApp / SMS follow-up sequence
  try {
    const { enrollFirstTimerInSequence } = require('./firstTimerSequenceService');
    const { rows: churchInfo } = await query('SELECT name FROM churches WHERE id = $1', [churchId]);
    enrollFirstTimerInSequence({
      churchId,
      firstTimer: rows[0],
      churchName: churchInfo[0]?.name || 'ChurchOS',
      pastorName: 'the Pastorate',
    }).catch(seqErr => console.warn('Could not auto-enroll first timer sequence:', seqErr.message));
  } catch (err) {
    // Non-fatal if sequence service encounters issue
  }

  return rows[0];
};

const { autoAssignFellowshipCell } = require('./fellowshipAssignmentService');

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const logger = require('../config/logger');

const createMemberRecord = async ({ churchId, data, user }) => {
  const {
    firstName, lastName, middleName, email, phone, phoneAlt,
    dateOfBirth, gender, maritalStatus, weddingAnniversaryDate, wedding_anniversary_date,
    address, city, state, country,
    occupation, employer, membershipClass, joinDate, baptismDate,
    waterBaptized, holyGhostBaptized, salvationDate, branchId,
    nextOfKinName, nextOfKinPhone, nextOfKinRelationship, notes, membershipStatus,
    hasChildren, childrenCount, teenagersCount, childrenDetails,
    spouseName, spouse_name, spousePhone, spouse_phone,
    spouseAlreadyRegisteredChildren, spouse_already_registered_children,
    familyId, family_id, spouseId, spouse_id, familyRole, family_role,
    isPrimaryFamilyContact, is_primary_family_contact,
    isWorker, workerUnit, workerRole, fellowshipCellId, latitude, longitude,
    designation, leadershipTitle, leadership_title, assignedPastorId, assigned_pastor_id,
    password
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
  const finalAnniversaryDate = (maritalStatus === 'married' || !maritalStatus)
    ? (weddingAnniversaryDate || wedding_anniversary_date || null)
    : null;

  const finalSpouseName = spouseName || spouse_name || null;
  const finalSpousePhone = spousePhone || spouse_phone || null;
  const spouseHasChildrenRegistered = !!(spouseAlreadyRegisteredChildren || spouse_already_registered_children);

  let assignedFamilyId = familyId || family_id || null;
  let linkedSpouseId = spouseId || spouse_id || null;
  let isPrimaryContact = isPrimaryFamilyContact !== undefined
    ? Boolean(isPrimaryFamilyContact)
    : (is_primary_family_contact !== undefined ? Boolean(is_primary_family_contact) : true);
  let finalChildrenCount = cCount;
  let finalTeenagersCount = tCount;
  let finalChildrenDetails = childrenDetails || null;
  let finalUserHasChildren = userHasChildren;
  let finalFamilyRole = familyRole || family_role || (maritalStatus === 'married' ? 'head' : 'member');

  // Smart Household / Spouse Matching for married members
  if (maritalStatus === 'married' && !linkedSpouseId) {
    try {
      let spouseQuery = null;
      let spouseParams = [];

      if (finalSpousePhone && phone) {
        spouseQuery = `SELECT * FROM members WHERE church_id = $1 AND marital_status = 'married' AND (
          phone = $2 OR phone_alt = $2 OR spouse_phone = $3
        ) LIMIT 1`;
        spouseParams = [churchId, finalSpousePhone.trim(), phone.trim()];
      } else if (finalSpousePhone) {
        spouseQuery = `SELECT * FROM members WHERE church_id = $1 AND marital_status = 'married' AND (
          phone = $2 OR phone_alt = $2
        ) LIMIT 1`;
        spouseParams = [churchId, finalSpousePhone.trim()];
      } else if (phone) {
        spouseQuery = `SELECT * FROM members WHERE church_id = $1 AND marital_status = 'married' AND spouse_phone = $2 LIMIT 1`;
        spouseParams = [churchId, phone.trim()];
      } else if (finalAnniversaryDate && address) {
        spouseQuery = `SELECT * FROM members WHERE church_id = $1 AND marital_status = 'married'
          AND wedding_anniversary_date = $2
          AND LOWER(TRIM(address)) = LOWER(TRIM($3))
          LIMIT 1`;
        spouseParams = [churchId, finalAnniversaryDate, address.trim()];
      }

      if (spouseQuery) {
        const { rows: matchedSpouses } = await query(spouseQuery, spouseParams);
        if (matchedSpouses.length > 0) {
          const existingSpouse = matchedSpouses[0];
          linkedSpouseId = existingSpouse.id;
          assignedFamilyId = existingSpouse.family_id || existingSpouse.id;
          finalFamilyRole = 'spouse';

          if (!existingSpouse.family_id) {
            await query('UPDATE members SET family_id = $1 WHERE id = $2', [assignedFamilyId, existingSpouse.id]);
          }

          // CHILDREN DEDUPLICATION:
          const spouseHadChildren = existingSpouse.has_children && (existingSpouse.children_count > 0 || existingSpouse.teenagers_count > 0);

          if (spouseHasChildrenRegistered || spouseHadChildren) {
            // Second spouse registering in same household: secondary demographic contact to avoid double counting
            isPrimaryContact = false;
            finalUserHasChildren = true;

            if (finalChildrenCount === 0 && finalTeenagersCount === 0) {
              finalChildrenCount = existingSpouse.children_count || 0;
              finalTeenagersCount = existingSpouse.teenagers_count || 0;
              finalChildrenDetails = existingSpouse.children_details || null;
            } else if (finalChildrenDetails && !existingSpouse.children_details) {
              await query(
                `UPDATE members SET children_details = $1, children_count = $2, teenagers_count = $3 WHERE id = $4`,
                [finalChildrenDetails, finalChildrenCount, finalTeenagersCount, existingSpouse.id]
              );
            }
          } else if (userHasChildren) {
            isPrimaryContact = true;
            await query(
              `UPDATE members SET has_children = true, children_count = $1, teenagers_count = $2, children_details = $3, is_primary_family_contact = false WHERE id = $4`,
              [finalChildrenCount, finalTeenagersCount, finalChildrenDetails, existingSpouse.id]
            );
          }
        }
      }
    } catch (matchErr) {
      logger.warn('Household auto-linking error in createMemberRecord', { error: matchErr.message });
    }
  }

  if (!assignedFamilyId) {
    assignedFamilyId = uuidv4();
  }

  // Password setup & onboarding tokens
  let passwordHash = null;
  let portalInvitedAt = null;
  if (password && typeof password === 'string' && password.trim().length >= 8) {
    passwordHash = await bcrypt.hash(password.trim(), 12);
    portalInvitedAt = new Date();
  }

  const setPasswordToken = crypto.randomBytes(32).toString('hex');
  const setPasswordExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days validity

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
      designation, leadership_title, assigned_pastor_id,
      wedding_anniversary_date, password_hash, portal_invited_at, set_password_token, set_password_expires_at,
      family_id, spouse_id, spouse_name, spouse_phone, is_primary_family_contact, family_role
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,
      $42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52
    )
    RETURNING *`,
    [
      id, churchId, safeBranchId, memberNumber, firstName, lastName, middleName || null,
      email || null, phone || null, phoneAlt || null, dateOfBirth || null, gender || null,
      maritalStatus || null, address || null, city || null, state || null, country || null,
      membershipStatus || 'active', occupation || null, employer || null, membershipClass || 'full', joinDate || null, baptismDate || null,
      waterBaptized || false, holyGhostBaptized || false, salvationDate || null,
      nextOfKinName || null, nextOfKinPhone || null, nextOfKinRelationship || null, notes || null,
      finalUserHasChildren, finalChildrenCount, finalTeenagersCount, finalChildrenDetails,
      userIsWorker, workerUnit || null, workerRole || 'worker', fellowshipCellId || null,
      userDesignation, finalLeadershipTitle, finalAssignedPastor,
      finalAnniversaryDate, passwordHash, portalInvitedAt, setPasswordToken, setPasswordExpiresAt,
      assignedFamilyId, linkedSpouseId, finalSpouseName, finalSpousePhone, isPrimaryContact, finalFamilyRole
    ]
  );

  const member = rows[0];

  // Establish reciprocal bidirectional spouse link on the existing spouse
  if (linkedSpouseId) {
    try {
      await query(
        `UPDATE members
         SET spouse_id = $1,
             family_id = $2,
             spouse_name = COALESCE(spouse_name, $3),
             spouse_phone = COALESCE(spouse_phone, $4)
         WHERE id = $5`,
        [id, assignedFamilyId, `${firstName} ${lastName}`.trim(), phone || null, linkedSpouseId]
      );
    } catch (linkErr) {
      logger.warn('Could not establish reciprocal spouse link:', { error: linkErr.message });
    }
  }

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