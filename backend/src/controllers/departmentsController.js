const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getDepartments = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.*,
              b.name as branch_name,
              m.first_name || ' ' || m.last_name as head_name,
              (SELECT COUNT(*) FROM member_departments md WHERE md.department_id = d.id AND md.is_active = true) as member_count
       FROM departments d
       LEFT JOIN branches b ON b.id = d.branch_id
       LEFT JOIN members m ON m.id = d.head_member_id
       WHERE d.church_id = $1 AND d.is_active = true
       ORDER BY d.category, d.name`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createDepartment = async (req, res) => {
  const { name, description, category, headMemberId, meetingSchedule, branchId } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO departments (id, church_id, branch_id, name, description, category, head_member_id, meeting_schedule)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuidv4(), req.churchId, branchId || null, name, description || null, category || null, headMemberId || null, meetingSchedule || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
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
    await query(
      `UPDATE member_departments SET is_active = false
       WHERE department_id = $1 AND member_id = $2 AND church_id = $3`,
      [departmentId, memberId, req.churchId]
    );
    return res.json({ success: true, message: 'Member removed from department' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDepartments, createDepartment, getDepartmentMembers, addMemberToDepartment, removeMemberFromDepartment };
