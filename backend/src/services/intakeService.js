const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const logger = require('../config/logger');
const { sendEmail } = require('./emailService');
const { sendWhatsApp, sendSMS } = require('./smsService');

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
    howDidYouHear, visitDate, serviceAttended, prayerRequest, branchId,
    wantsToJoinChurch, wants_to_join_church, decision,
    photoUrl, photo_url, profilePhotoUrl, profile_photo_url,
  } = data;

  const safeBranchId = await ensureBranchBelongsToChurch(churchId, branchId || null);
  const finalWantsToJoin = Boolean(wantsToJoinChurch || wants_to_join_church || decision === 'join_church');
  const finalDecision = decision || (finalWantsToJoin ? 'join_church' : 'considering');
  const finalPhotoUrl = photoUrl || photo_url || profilePhotoUrl || profile_photo_url || null;

  // 1. Auto-assign to a volunteer in the Friendship Team / Follow-up Ministry
  let assignedUserId = null;
  let assignedMemberId = null;
  let assignedWorker = null;

  try {
    const { rows: workers } = await query(
      `SELECT m.id as member_id, m.first_name, m.last_name, m.email, m.phone, u.id as user_id,
              (SELECT COUNT(*) FROM first_timers ft WHERE ft.follow_up_assigned_to = u.id AND ft.follow_up_status = 'pending') as active_load
       FROM member_departments md
       JOIN departments d ON d.id = md.department_id
       JOIN members m ON m.id = md.member_id
       LEFT JOIN users u ON (u.member_id = m.id OR LOWER(TRIM(u.email)) = LOWER(TRIM(m.email)))
       WHERE d.church_id = $1
         AND (d.name ILIKE '%friendship%' OR d.name ILIKE '%follow%' OR d.name ILIKE '%welcome%')
         AND md.is_active = true
         AND m.membership_status = 'active'
       ORDER BY active_load ASC, md.joined_at ASC
       LIMIT 1`,
      [churchId]
    );

    if (workers.length > 0) {
      assignedWorker = workers[0];
      assignedUserId = assignedWorker.user_id || null;
      assignedMemberId = assignedWorker.member_id;
    } else {
      // Fallback: look for users with pastoral or follow-up role
      const { rows: staff } = await query(
        `SELECT id as user_id, first_name, last_name, email, phone, member_id
         FROM users
         WHERE church_id = $1 AND role IN ('pastor', 'head_pastor', 'director', 'admin')
         ORDER BY (SELECT COUNT(*) FROM first_timers ft WHERE ft.follow_up_assigned_to = users.id AND ft.follow_up_status = 'pending') ASC
         LIMIT 1`,
        [churchId]
      );
      if (staff.length > 0) {
        assignedWorker = staff[0];
        assignedUserId = assignedWorker.user_id;
        assignedMemberId = assignedWorker.member_id || null;
      }
    }
  } catch (workerErr) {
    logger.warn('Could not auto-assign friendship team worker', { error: workerErr.message });
  }

  const { rows } = await query(
    `INSERT INTO first_timers (
      id, church_id, branch_id, first_name, last_name, email, phone, address,
      gender, date_of_birth, how_did_you_hear, visit_date, service_attended, prayer_request,
      wants_to_join_church, decision, photo_url, profile_photo_url,
      follow_up_assigned_to, assigned_member_id, assigned_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, CASE WHEN $19 IS NOT NULL OR $20 IS NOT NULL THEN NOW() ELSE NULL END)
    RETURNING *`,
    [
      uuidv4(), churchId, safeBranchId, firstName, lastName, email || null,
      phone || null, address || null, gender || null, dateOfBirth || null,
      howDidYouHear || null, visitDate || new Date(), serviceAttended || null, prayerRequest || null,
      finalWantsToJoin, finalDecision, finalPhotoUrl, finalPhotoUrl,
      assignedUserId, assignedMemberId
    ]
  );

  const firstTimer = rows[0];

  if (prayerRequest && prayerRequest.trim()) {
    await query(
      `INSERT INTO prayer_requests (id, church_id, branch_id, first_timer_id, requester_name, request, category, is_anonymous)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uuidv4(), churchId, safeBranchId, firstTimer.id, `${firstName} ${lastName}`, prayerRequest, 'others', false]
    ).catch(() => {});
  }

  // Create follow_up entry in pastoral care
  if (assignedUserId || assignedMemberId) {
    query(
      `INSERT INTO follow_ups (
        id, church_id, first_timer_id, assigned_to, follow_up_type, status, notes
      ) VALUES ($1, $2, $3, $4, 'call', 'pending', $5)`,
      [
        uuidv4(), churchId, firstTimer.id, assignedUserId,
        `Friendship Team Follow-up: ${assignedWorker ? `${assignedWorker.first_name} ${assignedWorker.last_name}` : 'Assigned'}`
      ]
    ).catch(() => {});
  }

  // Dispatch Instant WhatsApp / SMS / Email Notification to Assigned Friendship Worker
  if (assignedWorker && (assignedWorker.phone || assignedWorker.email)) {
    Promise.resolve().then(async () => {
      try {
        const { rows: churchInfo } = await query('SELECT name, settings FROM churches WHERE id = $1', [churchId]);
        const churchName = churchInfo[0]?.name || 'ChurchOS';
        const churchSettings = churchInfo[0]?.settings?.messaging || {};

        const joinBadge = finalWantsToJoin ? '🌟 YES, wants to join church!' : finalDecision === 'visiting' ? '✈️ Visiting from out of town' : 'Thinking/Praying about it';
        const notifyBody =
          `Hello ${assignedWorker.first_name}, you have been assigned a new First Timer to follow up at *${churchName}*! 🤝\n\n` +
          `👤 *Name:* ${firstName} ${lastName}\n` +
          `📞 *Phone:* ${phone || 'N/A'}\n` +
          `📧 *Email:* ${email || 'N/A'}\n` +
          `📅 *Visited:* ${visitDate || new Date().toISOString().slice(0, 10)}\n` +
          `⛪ *Service:* ${serviceAttended || 'Main Service'}\n` +
          `🤝 *Home Church Decision:* ${joinBadge}\n` +
          (prayerRequest ? `🙏 *Prayer Request:* ${prayerRequest}\n` : '') +
          `\nPlease call or message them to welcome them warmly to our family! ❤️`;

        if (assignedWorker.phone) {
          const waRes = await sendWhatsApp({ to: assignedWorker.phone, body: notifyBody }, churchSettings).catch(() => null);
          if (!waRes?.success) {
            await sendSMS({ to: assignedWorker.phone, body: notifyBody }, churchSettings).catch(() => {});
          }
        }

        if (assignedWorker.email) {
          await sendEmail({
            to: assignedWorker.email,
            subject: `🤝 New First Timer Assigned to You: ${firstName} ${lastName} (${churchName})`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #065f46; margin-top: 0;">New First-Timer Follow-Up Assignment 🤝</h2>
                <p>Hello <strong>${assignedWorker.first_name}</strong>,</p>
                <p>You have been assigned to follow up and welcome a new first-time guest who worshipped at <strong>${churchName}</strong>.</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 16px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 4px 0;"><strong>Guest Name:</strong> ${firstName} ${lastName}</p>
                  <p style="margin: 4px 0;"><strong>Phone:</strong> <a href="tel:${phone}">${phone || 'N/A'}</a></p>
                  <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email || 'N/A'}</a></p>
                  <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceAttended || 'Main Service'}</p>
                  <p style="margin: 4px 0;"><strong>Decision:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${joinBadge}</span></p>
                  ${prayerRequest ? `<p style="margin: 8px 0 0 0;"><strong>Prayer Request:</strong> <em>"${prayerRequest}"</em></p>` : ''}
                </div>
                <p style="color: #475569; font-size: 14px;">Please reach out via call or WhatsApp within 24 hours to welcome them with warmth and pastoral love.</p>
                <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">${churchName} Pastoral Care & Friendship Ministry</p>
              </div>
            `
          }, churchSettings).catch(() => {});
        }
      } catch (notifyErr) {
        logger.warn('Failed to notify assigned friendship worker', { error: notifyErr.message });
      }
    });
  }

  // Trigger automated WhatsApp / SMS follow-up sequence
  try {
    const { enrollFirstTimerInSequence } = require('./firstTimerSequenceService');
    const { rows: churchInfo } = await query('SELECT name FROM churches WHERE id = $1', [churchId]);
    enrollFirstTimerInSequence({
      churchId,
      firstTimer,
      churchName: churchInfo[0]?.name || 'ChurchOS',
      pastorName: 'the Pastorate',
    }).catch(seqErr => console.warn('Could not auto-enroll first timer sequence:', seqErr.message));
  } catch (err) {
    // Non-fatal if sequence service encounters issue
  }

  return firstTimer;
};

const { autoAssignFellowshipCell } = require('./fellowshipAssignmentService');
const { getNextMemberNumber } = require('../utils/memberNumber');

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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
    password, profilePhotoUrl, profile_photo_url, photoUrl, photo_url
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

  const memberNumber = await getNextMemberNumber({ query }, churchId, 'MBR', currentMembers);

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
  const finalProfilePhotoUrl = profilePhotoUrl || profile_photo_url || photoUrl || photo_url || null;
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
      family_id, spouse_id, spouse_name, spouse_phone, is_primary_family_contact, family_role, profile_photo_url
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,
      $42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53
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
      assignedFamilyId, linkedSpouseId, finalSpouseName, finalSpousePhone, isPrimaryContact, finalFamilyRole, finalProfilePhotoUrl
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

  // Create linked child members in the household if children array provided
  if (Array.isArray(data.children) && data.children.length > 0) {
    const validChildren = data.children.filter(c => c && c.firstName && c.firstName.trim());
    let addedCount = 0;
    for (let i = 0; i < validChildren.length; i++) {
      const ch = validChildren[i];
      const childId = uuidv4();
      const childMemberNumber = await getNextMemberNumber({ query }, churchId, 'KID', currentMembers + 1 + i);
      let calculatedAge = null;
      let childClass = 'child';
      let autoClassroom = ch.classroom || ch.demographicCategory || 'Children';

      if (ch.dateOfBirth) {
        const dob = new Date(ch.dateOfBirth);
        if (!isNaN(dob.getTime())) {
          const diffMs = Date.now() - dob.getTime();
          calculatedAge = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
          if (calculatedAge <= 3) autoClassroom = 'Toddlers';
          else if (calculatedAge <= 8) autoClassroom = 'Primary';
          else if (calculatedAge <= 12) autoClassroom = 'Pre-Teens';
          else {
            autoClassroom = 'Teens';
            childClass = 'youth';
          }
        }
      }

      try {
        await query(
          `INSERT INTO members (
            id, church_id, branch_id, member_number, first_name, last_name,
            date_of_birth, gender, marital_status, address, city, state, country,
            membership_status, membership_class, join_date,
            family_id, family_role, is_primary_family_contact,
            notes, custom_fields, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, 'single', $9, $10, $11, $12,
            'active', $13, $14,
            $15, 'child', false,
            $16, $17, $18, $19, 'Parent'
          )`,
          [
            childId, churchId, safeBranchId, childMemberNumber,
            ch.firstName.trim(), (ch.lastName || lastName || '').trim(),
            ch.dateOfBirth || null, ch.gender || null,
            address || null, city || null, state || null, country || null,
            childClass, joinDate || new Date().toISOString().slice(0, 10),
            assignedFamilyId,
            ch.allergiesMedical ? `Allergies/Medical: ${ch.allergiesMedical.trim()}` : null,
            JSON.stringify({
              allergies_medical: ch.allergiesMedical || null,
              classroom: autoClassroom,
              age: calculatedAge
            }),
            `${firstName} ${lastName}`.trim(), phone || null
          ]
        );
        addedCount++;
      } catch (childErr) {
        logger.warn('Failed to insert linked child member record', { error: childErr.message, child: ch.firstName });
      }
    }

    if (addedCount > 0) {
      await query(
        `UPDATE members
         SET has_children = true,
             children_count = COALESCE(children_count, 0) + $1
         WHERE id = $2`,
        [addedCount, id]
      ).catch(() => {});
      member.has_children = true;
      member.children_count = (member.children_count || 0) + addedCount;
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