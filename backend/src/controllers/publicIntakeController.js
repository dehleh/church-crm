const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { createFirstTimerRecord, createMemberRecord, ensureBranchBelongsToChurch } = require('../services/intakeService');

const getChurchBySlug = async (slug) => {
  const { rows } = await query(
    `SELECT id, name, slug, logo_url, banner_url, tagline, city, state, country, settings, is_active
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

    const { rows: departments } = await query(
      `SELECT id, name, category
       FROM departments
       WHERE church_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [church.id]
    );

    const { rows: fellowshipCenters } = await query(
      `SELECT id, name, city, landmark, meeting_day, meeting_time
       FROM fellowship_centers
       WHERE church_id = $1 AND status = 'active'
       ORDER BY name ASC`,
      [church.id]
    );

    const { rows: pastors } = await query(
      `SELECT id, first_name || ' ' || last_name as name, leadership_title, designation
       FROM members
       WHERE church_id = $1 AND (designation IN ('pastor', 'director') OR worker_role ILIKE '%pastor%')
         AND membership_status = 'active'
       ORDER BY first_name ASC`,
      [church.id]
    );

    return res.json({
      success: true,
      data: {
        church: {
          name: church.name,
          slug: church.slug,
          logoUrl: church.logo_url,
          bannerUrl: church.banner_url,
          tagline: church.tagline,
          city: church.city,
          state: church.state,
          country: church.country,
          settings: church.settings || {},
        },
        branches,
        welfarePackages,
        departments,
        fellowshipCenters,
        pastors,
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

const { sendEmail } = require('../services/emailService');
const { sendWhatsApp, sendSMS } = require('../services/smsService');

const submitMember = async (req, res) => {
  try {
    const church = await getChurchBySlug(req.params.slug);
    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    // Default status: 'active' so the member can immediately sign in to portal
    // If church has explicitly enabled strict approval in settings, honor 'pending_review'
    const status = church.settings?.require_member_approval ? 'pending_review' : 'active';

    const record = await createMemberRecord({
      churchId: church.id,
      data: { ...req.body, membershipStatus: status }
    });

    const origin = req.headers.origin || (req.headers.host ? `${req.secure ? 'https' : 'http'}://${req.headers.host}` : null);
    const baseUrl = (origin && !origin.includes(':5000'))
      ? origin
      : (process.env.FRONTEND_URL || process.env.APP_URL || 'https://cos.themobilemissionary.org');

    const hasPassword = Boolean(record.password_hash);
    const setPasswordUrl = `${baseUrl}/portal/${church.slug}/set-password?token=${record.set_password_token || ''}&email=${encodeURIComponent(record.email || '')}`;
    const portalLoginUrl = `${baseUrl}/portal/${church.slug}/login`;
    const actionUrl = hasPassword ? portalLoginUrl : setPasswordUrl;

    const churchSettings = church.settings?.messaging || {};

    // 1. Dispatch Welcome & Portal Access Email
    if (record.email) {
      sendEmail({
        to: record.email,
        subject: `Welcome to ${church.name}! Your Member ID & Portal Access ⛪`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              ${church.logo_url ? `<img src="${church.logo_url}" alt="${church.name}" style="height: 56px; max-width: 180px; object-fit: contain; margin-bottom: 12px;" />` : ''}
              <h1 style="color: #065f46; margin: 0 0 6px 0; font-size: 22px;">Welcome to the Family of God! 🎉</h1>
              <p style="color: #64748b; font-size: 14px; margin: 0;">${church.name}</p>
            </div>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <p style="margin: 0 0 10px 0; font-size: 15px; color: #166534; font-weight: 600;">Dear ${record.first_name},</p>
              <p style="margin: 0; font-size: 14px; color: #15803d; line-height: 1.6;">
                We are thrilled to welcome you into fellowship at <strong>${church.name}</strong>! Your church membership profile has been successfully cataloged.
              </p>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Your Membership Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 40%;">Member ID / Number:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #0f172a;"><span style="background: #e2e8f0; padding: 3px 8px; border-radius: 6px; font-family: monospace;">${record.member_number}</span></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Designation / Office:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-transform: capitalize;">${record.leadership_title ? `${record.leadership_title} (${record.designation})` : record.designation || 'Member'}</td>
                </tr>
                ${record.assigned_cell ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Assigned Cell / Fellowship:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #065f46;">${record.assigned_cell.name} (${record.assigned_cell.meetingDay || 'Weekly'} at ${record.assigned_cell.meetingTime || 'Evening'})</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <p style="font-size: 14px; color: #475569; margin-bottom: 16px; line-height: 1.5;">
                ${hasPassword
                  ? 'Your password was set during registration. Click below to sign in to your Church Mobile Portal:'
                  : 'To activate your mobile access and view daily devotionals, prayers, fellowship centers, and giving, please create your password:'}
              </p>
              <a href="${actionUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
                ${hasPassword ? 'Sign In to Member Portal →' : 'Set Your Password & Sign In →'}
              </a>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 12px;">
                Link: <a href="${actionUrl}" style="color: #059669; word-break: break-all;">${actionUrl}</a>
              </p>
            </div>

            <div style="border-top: 1px solid #f1f5f9; padding-top: 18px; text-align: center; font-size: 13px; color: #64748b;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #334155;">With pastoral love and blessings,</p>
              <p style="margin: 0;">${church.name}</p>
            </div>
          </div>
        `,
      }, churchSettings).catch(err => logger.warn('Failed to send member welcome email', { error: err.message }));
    }

    // 2. Dispatch Welcome & Portal Access via WhatsApp / SMS
    if (record.phone) {
      const waText =
        `Welcome to *${church.name}*, ${record.first_name}! 🙏🎉\n\n` +
        `Your church membership registration is confirmed.\n` +
        `🆔 *Member ID:* ${record.member_number}\n` +
        `📋 *Designation:* ${record.leadership_title ? `${record.leadership_title} (${record.designation})` : record.designation || 'Member'}\n` +
        (record.assigned_cell ? `🏡 *Cell Fellowship:* ${record.assigned_cell.name} (${record.assigned_cell.meetingDay} ${record.assigned_cell.meetingTime})\n` : '') +
        `\n📱 *Access Your Church Mobile Portal:*\n${actionUrl}\n\n` +
        `Sign in to access daily devotionals, prayer requests, online giving, and announcements anytime on your phone. God bless you! ✨`;

      sendWhatsApp({ to: record.phone, body: waText }, churchSettings)
        .then(waRes => {
          if (!waRes.success) {
            sendSMS({ to: record.phone, body: `Welcome to ${church.name}, ${record.first_name}! Member ID: ${record.member_number}. Access your member portal: ${actionUrl}` }, churchSettings).catch(() => {});
          }
        })
        .catch(err => logger.warn('Failed to send member welcome WhatsApp', { error: err.message }));
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you. Your membership onboarding has been successfully completed.',
      data: {
        member: record,
        memberNumber: record.member_number,
        designation: record.designation,
        leadershipTitle: record.leadership_title,
        assignedCell: record.assigned_cell || null,
        hasPassword,
        portalUrl: portalLoginUrl,
        setPasswordUrl,
      },
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