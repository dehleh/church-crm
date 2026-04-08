const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getGroups = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT g.*,
              m.first_name || ' ' || m.last_name as leader_name,
              (SELECT COUNT(*) FROM member_groups mg WHERE mg.group_id = g.id AND mg.is_active = true) as member_count
       FROM groups g
       LEFT JOIN members m ON m.id = g.leader_member_id
       WHERE g.church_id = $1 AND g.is_active = true
       ORDER BY g.name`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createGroup = async (req, res) => {
  const { name, description, purpose, leaderMemberId, meetingSchedule } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Group name is required' });
  try {
    const { rows } = await query(
      `INSERT INTO groups (id, church_id, name, description, purpose, leader_member_id, meeting_schedule)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [uuidv4(), req.churchId, name, description || null, purpose || null, leaderMemberId || null, meetingSchedule || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, description, purpose, leaderMemberId, meetingSchedule, isActive } = req.body;
  try {
    const { rows } = await query(
      `UPDATE groups SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        purpose = COALESCE($3, purpose),
        leader_member_id = $4,
        meeting_schedule = COALESCE($5, meeting_schedule),
        is_active = COALESCE($6, is_active)
       WHERE id = $7 AND church_id = $8
       RETURNING *`,
      [name, description, purpose, leaderMemberId || null, meetingSchedule, isActive, id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Group not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getGroupMembers = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT m.id, m.first_name, m.last_name, m.email, m.phone, m.gender,
              mg.role as group_role, mg.joined_at
       FROM member_groups mg
       JOIN members m ON m.id = mg.member_id
       WHERE mg.group_id = $1 AND mg.church_id = $2 AND mg.is_active = true
       ORDER BY mg.role, m.first_name`,
      [id, req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addMemberToGroup = async (req, res) => {
  const { id: groupId } = req.params;
  const { memberId, role = 'member' } = req.body;
  if (!memberId) return res.status(400).json({ success: false, message: 'memberId is required' });
  try {
    const { rows } = await query(
      `INSERT INTO member_groups (id, church_id, member_id, group_id, role)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (member_id, group_id) DO UPDATE SET is_active = true, role = $5
       RETURNING *`,
      [uuidv4(), req.churchId, memberId, groupId, role]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeMemberFromGroup = async (req, res) => {
  const { id: groupId, memberId } = req.params;
  try {
    await query(
      `UPDATE member_groups SET is_active = false
       WHERE group_id = $1 AND member_id = $2 AND church_id = $3`,
      [groupId, memberId, req.churchId]
    );
    return res.json({ success: true, message: 'Member removed from group' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getGroups, createGroup, updateGroup, getGroupMembers, addMemberToGroup, removeMemberFromGroup };
