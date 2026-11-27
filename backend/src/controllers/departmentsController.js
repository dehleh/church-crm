const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { resolveWriteBranchId, applyBranchFilter } = require('../utils/branchScope');
const logger = require('../config/logger');

// ── Department Pre-Service Checklist Presets ─────────────────────────────
const DEPARTMENT_PRESET_ITEMS = {
  media: [
    { title: 'Check camera batteries, memory cards, and video capture feeds', category: 'Equipment' },
    { title: 'Verify live stream RTMP key & title on YouTube and Facebook', category: 'Streaming' },
    { title: 'Audio feed from sound console to streaming encoder synced and tested', category: 'Streaming' },
    { title: 'Projection & lyrics/scriptures loaded in presentation software', category: 'Sanctuary' },
    { title: 'Assign live chat moderator and test online greeting', category: 'Digital Stream' },
    { title: 'Confidence monitor & countdown clock configured on stage', category: 'Equipment' },
  ],
  sound: [
    { title: 'Power on sound console and verify line checks across all channels', category: 'Equipment' },
    { title: 'Test pastoral wireless lapel / headset mics (battery at 100%)', category: 'Audio' },
    { title: 'Test choir & lead vocal handheld wireless microphones', category: 'Audio' },
    { title: 'Dial in in-ear monitor mixes and stage wedges with musicians', category: 'Audio' },
    { title: 'Balance main auditorium PA & subwoofers without feedback', category: 'Sanctuary' },
    { title: 'Arm and verify master stereo / multitrack service audio recording', category: 'Equipment' },
  ],
  music: [
    { title: 'Musicians and vocalists sound check & rehearsal 45 mins before doors open', category: 'Sanctuary' },
    { title: 'Confirm song order, keys, and transitions with worship leader', category: 'General' },
    { title: 'Tune keyboards, guitars, bass, and drum kit', category: 'Equipment' },
    { title: 'Tidy up stage wiring, music stands, and mic clips', category: 'Sanctuary' },
  ],
  usher: [
    { title: 'Offering envelopes, tithe slips, and visitor cards stocked at entrances', category: 'Logistics' },
    { title: 'Place reserved seat markers for pastors, guest ministers & elderly', category: 'Sanctuary' },
    { title: 'Position offering collection baskets and brief ushers on route', category: 'Logistics' },
    { title: 'Door greeters in position with name badges 30 mins before service', category: 'Hospitality' },
    { title: 'Check emergency exit aisles are completely clear and accessible', category: 'Safety' },
  ],
  children: [
    { title: 'Safety check-in station tablet and label sticker printer operational', category: 'Safety' },
    { title: 'Classrooms sanitized, craft supplies, paper, and crayons stocked', category: 'Logistics' },
    { title: 'Review snack allergies and medical alerts roster with caregivers', category: 'Safety' },
    { title: 'First-aid kit and parent emergency notification buzzer verified', category: 'Safety' },
    { title: 'Teachers and assistants signed in and stationed in assigned age rooms', category: 'General' },
  ],
  facility: [
    { title: 'Turn on auditorium air conditioning / heating 45 mins before doors open', category: 'Sanctuary' },
    { title: 'Restrooms inspected, toilet rolls stocked, hand sanitizer refilled', category: 'Sanctuary' },
    { title: 'Water bottles and glasses staged in green room and pulpit', category: 'Hospitality' },
    { title: 'Prepare holy communion elements, trays, and coverings if scheduled', category: 'Logistics' },
  ],
  general: [
    { title: 'Team pre-service prayer and operational briefing completed', category: 'General' },
    { title: 'Service supplies and unit equipment staged', category: 'Logistics' },
    { title: 'Individual volunteer roles and backup coverage confirmed', category: 'General' },
    { title: 'Post-service pack-down and security schedule designated', category: 'Logistics' },
  ]
};

function getPresetChecklistItems(identifier = '') {
  const norm = String(identifier).toLowerCase();
  if (norm.includes('media') || norm.includes('stream') || norm.includes('tech') || norm.includes('camera') || norm.includes('video') || norm.includes('e-church')) {
    return DEPARTMENT_PRESET_ITEMS.media;
  }
  if (norm.includes('sound') || norm.includes('audio')) {
    return DEPARTMENT_PRESET_ITEMS.sound;
  }
  if (norm.includes('music') || norm.includes('choir') || norm.includes('worship') || norm.includes('praise') || norm.includes('band')) {
    return DEPARTMENT_PRESET_ITEMS.music;
  }
  if (norm.includes('usher') || norm.includes('protocol') || norm.includes('greeter')) {
    return DEPARTMENT_PRESET_ITEMS.usher;
  }
  if (norm.includes('child') || norm.includes('kid') || norm.includes('junior') || norm.includes('teen') || norm.includes('youth')) {
    return DEPARTMENT_PRESET_ITEMS.children;
  }
  if (norm.includes('sanit') || norm.includes('clean') || norm.includes('facility') || norm.includes('welfare') || norm.includes('hospitality')) {
    return DEPARTMENT_PRESET_ITEMS.facility;
  }
  return DEPARTMENT_PRESET_ITEMS.general;
}

const getDepartments = async (req, res) => {
  try {
    let conditions = ['d.church_id = $1', 'd.is_active = true'];
    let params = [req.churchId];
    applyBranchFilter(req, 'd.branch_id', conditions, params, 2, { allowNullBranch: true });

    // HOD Jurisdiction Scoping: HODs only see what pertains to their own jurisdiction
    if (req.user?.role === 'hod') {
      if (req.user.department_id) {
        conditions.push(`d.id = $${params.length + 1}`);
        params.push(req.user.department_id);
      } else {
        conditions.push(`(
          d.head_user_id = $${params.length + 1}
          OR d.head_member_id IN (SELECT id FROM members WHERE email = $${params.length + 2} OR (phone IS NOT NULL AND phone = $${params.length + 3}))
          OR d.id IN (SELECT md.department_id FROM member_departments md JOIN members m ON m.id = md.member_id WHERE m.email = $${params.length + 2})
        )`);
        params.push(req.user.id, req.user.email, req.user.phone || '');
      }
    }

    const { rows } = await query(
      `SELECT d.*,
              b.name as branch_name,
              m.first_name || ' ' || m.last_name as head_name,
              u_dir.first_name || ' ' || u_dir.last_name as director_name,
              (SELECT COUNT(*) FROM member_departments md WHERE md.department_id = d.id AND md.is_active = true) as member_count
       FROM departments d
       LEFT JOIN branches b ON b.id = d.branch_id
       LEFT JOIN members m ON m.id = d.head_member_id
       LEFT JOIN users u_dir ON u_dir.id = d.director_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.category, d.name`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createDepartment = async (req, res) => {
  const { name, description, category, headMemberId, meetingSchedule, branchId, directorId } = req.body;
  try {
    const finalBranchId = resolveWriteBranchId(req, branchId);
    const { rows } = await query(
      `INSERT INTO departments (id, church_id, branch_id, name, description, category, head_member_id, meeting_schedule, director_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), req.churchId, finalBranchId, name, description || null, category || null, headMemberId || null, meetingSchedule || null, directorId || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, description, category, headMemberId, meetingSchedule, branchId, directorId } = req.body;
  try {
    const hasDirector = directorId !== undefined;
    const finalDirector = directorId || null;
    const { rows } = await query(
      `UPDATE departments SET
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        category = COALESCE($5, category),
        head_member_id = $6,
        meeting_schedule = COALESCE($7, meeting_schedule),
        branch_id = COALESCE($8, branch_id),
        director_id = CASE WHEN $9 = true THEN $10::uuid ELSE director_id END,
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, name, description, category, headMemberId || null, meetingSchedule, branchId || null, hasDirector, finalDirector]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Department not found' });
    return res.json({ success: true, data: rows[0], message: 'Department updated successfully' });
  } catch (err) {
    logger.error('updateDepartment error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error updating department' });
  }
};

const getDepartmentMembers = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT m.*, md.role as dept_role, md.joined_at
       FROM member_departments md
       JOIN members m ON m.id = md.member_id
       WHERE md.department_id = $1 AND md.church_id = $2 AND md.is_active = true
       ORDER BY md.role, m.first_name`,
      [id, req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addMemberToDepartment = async (req, res) => {
  const { id: departmentId } = req.params;
  const { memberId, role = 'member' } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO member_departments (id, church_id, member_id, department_id, role)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (member_id, department_id) DO UPDATE SET is_active = true, role = $5
       RETURNING *`,
      [uuidv4(), req.churchId, memberId, departmentId, role]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeMemberFromDepartment = async (req, res) => {
  const { id: departmentId, memberId } = req.params;
  try {
    const { rows } = await query(
      `UPDATE member_departments SET is_active = false
       WHERE department_id = $1 AND member_id = $2 AND church_id = $3
       RETURNING *`,
      [departmentId, memberId, req.churchId]
    );
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Member is not assigned to this department' });
    }
    return res.json({ success: true, message: 'Member removed from department successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error removing member from department' });
  }
};

const deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `UPDATE departments SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Department / Unit not found' });

    await query(
      `UPDATE member_departments SET is_active = false
       WHERE department_id = $1 AND church_id = $2`,
      [id, req.churchId]
    );

    return res.json({ success: true, message: 'Department / Unit deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error deleting department' });
  }
};

// ── Pre-Service Checklist Operations ─────────────────────────────────────

const getDepartmentChecklists = async (req, res) => {
  const { id: departmentId } = req.params;
  try {
    const { rows } = await query(
      `SELECT cl.*,
              COUNT(ci.id)::int as total_items,
              COUNT(CASE WHEN ci.is_completed = true THEN 1 END)::int as completed_items,
              u.first_name || ' ' || u.last_name as creator_name
       FROM department_service_checklists cl
       LEFT JOIN department_checklist_items ci ON ci.checklist_id = cl.id
       LEFT JOIN users u ON u.id = cl.created_by
       WHERE cl.department_id = $1 AND cl.church_id = $2
       GROUP BY cl.id, u.first_name, u.last_name
       ORDER BY cl.service_date DESC, cl.created_at DESC`,
      [departmentId, req.churchId]
    );

    const checklists = rows.map(r => ({
      ...r,
      progress_pct: r.total_items > 0 ? Math.round((r.completed_items / r.total_items) * 100) : 0,
    }));

    return res.json({ success: true, data: checklists });
  } catch (err) {
    logger.error('getDepartmentChecklists error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading checklists' });
  }
};

const getChecklistDetails = async (req, res) => {
  const { id: departmentId, checklistId } = req.params;
  try {
    const { rows: clRows } = await query(
      `SELECT cl.*, d.name as department_name, d.category as department_category
       FROM department_service_checklists cl
       JOIN departments d ON d.id = cl.department_id
       WHERE cl.id = $1 AND cl.department_id = $2 AND cl.church_id = $3`,
      [checklistId, departmentId, req.churchId]
    );
    if (!clRows[0]) return res.status(404).json({ success: false, message: 'Checklist not found' });

    const { rows: itemRows } = await query(
      `SELECT ci.*,
              m.first_name as assignee_first_name, m.last_name as assignee_last_name,
              m.phone as assignee_phone, m.profile_photo_url as assignee_photo_url,
              cb.first_name || ' ' || cb.last_name as completed_by_member_name
       FROM department_checklist_items ci
       LEFT JOIN members m ON m.id = ci.assigned_member_id
       LEFT JOIN members cb ON cb.id = ci.completed_by_member_id
       WHERE ci.checklist_id = $1
       ORDER BY ci.sort_order ASC, ci.created_at ASC`,
      [checklistId]
    );

    const total = itemRows.length;
    const completed = itemRows.filter(i => i.is_completed).length;

    return res.json({
      success: true,
      data: {
        ...clRows[0],
        total_items: total,
        completed_items: completed,
        progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
        items: itemRows,
      }
    });
  } catch (err) {
    logger.error('getChecklistDetails error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading checklist details' });
  }
};

const createDepartmentChecklist = async (req, res) => {
  const { id: departmentId } = req.params;
  const { serviceTitle, serviceDate, serviceTime, notes, initialItems, presetCategory } = req.body;

  if (!serviceTitle || !serviceDate) {
    return res.status(400).json({ success: false, message: 'Service title and date are required' });
  }

  try {
    // Verify department exists
    const { rows: deptRows } = await query(
      `SELECT name, category FROM departments WHERE id = $1 AND church_id = $2`,
      [departmentId, req.churchId]
    );
    if (!deptRows[0]) return res.status(404).json({ success: false, message: 'Department not found' });

    const checklistId = uuidv4();
    const { rows } = await query(
      `INSERT INTO department_service_checklists (
        id, church_id, branch_id, department_id, service_title, service_date, service_time, notes, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
      RETURNING *`,
      [checklistId, req.churchId, req.branchId || null, departmentId, serviceTitle, serviceDate, serviceTime || null, notes || null, req.user?.id || null]
    );

    // If preset or initial items requested, insert them
    let itemsToInsert = [];
    if (Array.isArray(initialItems) && initialItems.length > 0) {
      itemsToInsert = initialItems;
    } else if (presetCategory) {
      itemsToInsert = getPresetChecklistItems(presetCategory);
    } else {
      // Auto-detect based on department name / category
      itemsToInsert = getPresetChecklistItems(deptRows[0].category || deptRows[0].name);
    }

    if (itemsToInsert.length > 0) {
      for (let i = 0; i < itemsToInsert.length; i++) {
        const it = itemsToInsert[i];
        await query(
          `INSERT INTO department_checklist_items (
            id, checklist_id, department_id, title, category, assigned_member_id, sort_order, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            checklistId,
            departmentId,
            it.title,
            it.category || 'General',
            it.assigned_member_id || it.assignedMemberId || null,
            i,
            it.notes || null,
          ]
        );
      }
    }

    return res.status(201).json({
      success: true,
      data: rows[0],
      message: 'Service readiness checklist created successfully',
    });
  } catch (err) {
    logger.error('createDepartmentChecklist error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error creating checklist' });
  }
};

const updateDepartmentChecklist = async (req, res) => {
  const { id: departmentId, checklistId } = req.params;
  const { serviceTitle, serviceDate, serviceTime, notes, status } = req.body;
  try {
    const { rows } = await query(
      `UPDATE department_service_checklists SET
        service_title = COALESCE($1, service_title),
        service_date = COALESCE($2, service_date),
        service_time = COALESCE($3, service_time),
        notes = COALESCE($4, notes),
        status = COALESCE($5, status),
        updated_at = NOW()
       WHERE id = $6 AND department_id = $7 AND church_id = $8
       RETURNING *`,
      [serviceTitle, serviceDate, serviceTime, notes, status, checklistId, departmentId, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Checklist not found' });
    return res.json({ success: true, data: rows[0], message: 'Checklist updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteDepartmentChecklist = async (req, res) => {
  const { id: departmentId, checklistId } = req.params;
  try {
    const { rowCount } = await query(
      `DELETE FROM department_service_checklists WHERE id = $1 AND department_id = $2 AND church_id = $3`,
      [checklistId, departmentId, req.churchId]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'Checklist not found' });
    return res.json({ success: true, message: 'Checklist deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addChecklistItem = async (req, res) => {
  const { id: departmentId, checklistId } = req.params;
  const { title, category = 'General', assignedMemberId, notes, sortOrder } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Task title is required' });

  try {
    const { rows } = await query(
      `INSERT INTO department_checklist_items (
        id, checklist_id, department_id, title, category, assigned_member_id, sort_order, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [uuidv4(), checklistId, departmentId, title, category, assignedMemberId || null, sortOrder || 0, notes || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error adding item' });
  }
};

const updateChecklistItem = async (req, res) => {
  const { id: departmentId, checklistId, itemId } = req.params;
  const { title, category, assignedMemberId, isCompleted, notes, sortOrder } = req.body;

  try {
    const { rows: existing } = await query(
      `SELECT * FROM department_checklist_items WHERE id = $1 AND checklist_id = $2`,
      [itemId, checklistId]
    );
    if (!existing[0]) return res.status(404).json({ success: false, message: 'Item not found' });

    let completedAt = existing[0].completed_at;
    let completedByUserId = existing[0].completed_by_user_id;

    if (isCompleted !== undefined) {
      if (isCompleted) {
        completedAt = new Date().toISOString();
        completedByUserId = req.user?.id || null;
      } else {
        completedAt = null;
        completedByUserId = null;
      }
    }

    const { rows } = await query(
      `UPDATE department_checklist_items SET
        title = COALESCE($1, title),
        category = COALESCE($2, category),
        assigned_member_id = COALESCE($3, assigned_member_id),
        is_completed = COALESCE($4, is_completed),
        completed_at = $5,
        completed_by_user_id = $6,
        notes = COALESCE($7, notes),
        sort_order = COALESCE($8, sort_order),
        updated_at = NOW()
       WHERE id = $9 AND checklist_id = $10
       RETURNING *`,
      [title, category, assignedMemberId, isCompleted, completedAt, completedByUserId, notes, sortOrder, itemId, checklistId]
    );

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error updating item' });
  }
};

const deleteChecklistItem = async (req, res) => {
  const { checklistId, itemId } = req.params;
  try {
    await query(`DELETE FROM department_checklist_items WHERE id = $1 AND checklist_id = $2`, [itemId, checklistId]);
    return res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error deleting item' });
  }
};

const broadcastDepartmentChecklist = async (req, res) => {
  const { id: departmentId, checklistId } = req.params;
  const { channels = ['in_app'], customMessage } = req.body;

  try {
    // 1. Get checklist and department info
    const { rows: clRows } = await query(
      `SELECT cl.*, d.name as department_name, c.name as church_name, c.settings as church_settings
       FROM department_service_checklists cl
       JOIN departments d ON d.id = cl.department_id
       JOIN churches c ON c.id = cl.church_id
       WHERE cl.id = $1 AND cl.department_id = $2 AND cl.church_id = $3`,
      [checklistId, departmentId, req.churchId]
    );
    if (!clRows[0]) return res.status(404).json({ success: false, message: 'Checklist not found' });
    const cl = clRows[0];

    // 2. Get items
    const { rows: items } = await query(
      `SELECT ci.*, m.first_name as assignee_name
       FROM department_checklist_items ci
       LEFT JOIN members m ON m.id = ci.assigned_member_id
       WHERE ci.checklist_id = $1
       ORDER BY ci.sort_order ASC`,
      [checklistId]
    );

    // 3. Get all active department members
    const { rows: members } = await query(
      `SELECT m.id, m.first_name, m.last_name, m.phone, m.email
       FROM member_departments md
       JOIN members m ON m.id = md.member_id
       WHERE md.department_id = $1 AND md.is_active = true AND md.church_id = $2`,
      [departmentId, req.churchId]
    );

    if (members.length === 0) {
      return res.status(400).json({ success: false, message: 'No active members in this department to broadcast to' });
    }

    const itemBullets = items.map((it, idx) => `${idx + 1}. [${it.is_completed ? 'READY' : 'PENDING'}] ${it.title}${it.assignee_name ? ` (Assigned: ${it.assignee_name})` : ''}`).join('\n');
    const defaultBroadcastBody = `Pre-Service Checklist: *${cl.department_name}*\nService: ${cl.service_title} (${new Date(cl.service_date).toLocaleDateString()})\n\nTasks:\n${itemBullets}\n\nPlease check your member portal or ensure your tasks are prepared before service!`;

    // 4. Send In-App Push Notifications
    const pushNotificationService = require('../services/pushNotificationService');
    for (const mem of members) {
      try {
        await pushNotificationService.sendPushToMember(mem.id, {
          title: `${cl.department_name} Pre-Service Checklist`,
          body: `Checklist ready for ${cl.service_title}. Please review your unit tasks.`,
          data: { type: 'department_checklist', checklistId: cl.id, departmentId }
        });
      } catch {}
    }

    // 5. Send External WhatsApp / SMS / Email if selected
    const churchSettings = cl.church_settings?.messaging || {};
    if (channels.includes('whatsapp')) {
      const phones = members.map(m => m.phone).filter(Boolean);
      if (phones.length) {
        const { sendWhatsApp } = require('../services/smsService');
        await sendWhatsApp({ to: phones, body: customMessage || defaultBroadcastBody }, churchSettings);
      }
    }
    if (channels.includes('sms')) {
      const phones = members.map(m => m.phone).filter(Boolean);
      if (phones.length) {
        const { sendSMS } = require('../services/smsService');
        await sendSMS({ to: phones, body: (customMessage || defaultBroadcastBody).substring(0, 160) }, churchSettings);
      }
    }
    if (channels.includes('email')) {
      const emails = members.map(m => m.email).filter(Boolean);
      if (emails.length) {
        const { sendEmail } = require('../services/emailService');
        await sendEmail({
          to: emails,
          subject: `${cl.department_name} Pre-Service Checklist: ${cl.service_title}`,
          html: `<h2>${cl.department_name} Pre-Service Checklist</h2><p>Service: <strong>${cl.service_title}</strong> (${new Date(cl.service_date).toLocaleDateString()})</p><pre style="font-family: inherit; background:#f4f4f5; padding:12px; border-radius:8px; white-space: pre-wrap;">${itemBullets}</pre><p>Please review your assigned tasks and ensure full readiness before service begins.</p>`,
        }, churchSettings);
      }
    }

    // 6. Update broadcast status
    await query(
      `UPDATE department_service_checklists SET
        status = 'published',
        broadcast_sent_at = NOW(),
        broadcast_channels = $1,
        updated_at = NOW()
       WHERE id = $2`,
      [channels, checklistId]
    );

    return res.json({
      success: true,
      message: `Checklist broadcasted to ${members.length} unit members!`,
      recipientCount: members.length,
    });
  } catch (err) {
    logger.error('broadcastDepartmentChecklist error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error broadcasting checklist' });
  }
};

const getDepartmentChecklistTemplates = async (req, res) => {
  const { id: departmentId } = req.params;
  try {
    const { rows } = await query(
      `SELECT * FROM department_checklist_templates
       WHERE department_id = $1 AND church_id = $2
       ORDER BY created_at DESC`,
      [departmentId, req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error loading templates' });
  }
};

const saveDepartmentChecklistTemplate = async (req, res) => {
  const { id: departmentId } = req.params;
  const { name, serviceType = 'sunday', items, isDefault = false } = req.body;
  if (!name || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Template name and items are required' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO department_checklist_templates (
        id, church_id, department_id, name, service_type, items, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [uuidv4(), req.churchId, departmentId, name, serviceType, JSON.stringify(items), isDefault]
    );
    return res.status(201).json({ success: true, data: rows[0], message: 'Template saved' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error saving template' });
  }
};

const getPresetTemplates = async (req, res) => {
  const { category } = req.query;
  const items = getPresetChecklistItems(category || 'general');
  return res.json({ success: true, data: items });
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentMembers,
  addMemberToDepartment,
  removeMemberFromDepartment,
  getDepartmentChecklists,
  getChecklistDetails,
  createDepartmentChecklist,
  updateDepartmentChecklist,
  deleteDepartmentChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  broadcastDepartmentChecklist,
  getDepartmentChecklistTemplates,
  saveDepartmentChecklistTemplate,
  getPresetTemplates,
  getPresetChecklistItems,
};
