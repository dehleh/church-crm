/**
 * Role-Based Access Control (RBAC) System for ChurchOS
 * 
 * Hierarchy:
 * 1. Church Admin (`admin`, `head_pastor`): Compound access to everything.
 * 2. Pastor (`pastor`, `branch_pastor`): Pastoral ministry, care, discipleship, events.
 * 3. Director (`director`): Ministry oversight, departments, cells, programs.
 * 4. HOD (`hod`): Unit leadership, attendance, events, member coordination.
 * 5. Finance (`finance`, `accountant`): Budgets, ledger, transactions, procurement review, financial reports.
 * 6. Member (`member`): Member portal: profile, birthdays, announcements, media, devotionals, discipleship, giving.
 */

export const ADMIN_ROLES = ['head_pastor', 'admin', 'church_admin'];

export const ROLE_DETAILS = {
  head_pastor: {
    title: 'Church Admin (Lead Pastor)',
    badge: 'bg-red-100 text-red-700 border border-red-200',
    description: 'General compound access to everything across the church',
    level: 1,
  },
  admin: {
    title: 'Church Admin',
    badge: 'bg-rose-100 text-rose-700 border border-rose-200',
    description: 'General compound access to everything across the church',
    level: 1,
  },
  pastor: {
    title: 'Pastor',
    badge: 'bg-orange-100 text-orange-700 border border-orange-200',
    description: 'Pastoral oversight: members, discipleship, care, ministries, events',
    level: 2,
  },
  branch_pastor: {
    title: 'Branch Pastor',
    badge: 'bg-blue-100 text-blue-700 border border-blue-200',
    description: 'Pastoral leadership scoped to an assigned branch',
    level: 2,
  },
  director: {
    title: 'Ministry Director',
    badge: 'bg-purple-100 text-purple-700 border border-purple-200',
    description: 'Leadership over departments, fellowship cells, and church programs',
    level: 3,
  },
  finance: {
    title: 'Church Finance Team',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    description: 'Complete finance access: budgets, transactions, bank accounts, procurement',
    level: 4,
  },
  accountant: {
    title: 'Accountant',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    description: 'Finance team: budgets, accounts, income & expenditure ledger',
    level: 4,
  },
  hod: {
    title: 'Head of Department (HOD)',
    badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    description: 'Unit operations, department members, attendance, event coordination',
    level: 5,
  },
  branch_admin: {
    title: 'Branch Admin',
    badge: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
    description: 'Administrative coordination for an assigned branch',
    level: 5,
  },
  member: {
    title: 'Church Member',
    badge: 'bg-gray-100 text-gray-700 border border-gray-200',
    description: 'Member access: profile, birthdays, announcements, media, devotionals, giving',
    level: 6,
  },
};

/**
 * Checks if a user is a Church Admin or Platform Super Admin.
 * The Admin is the only role that has compound access to everything.
 */
export function isChurchAdmin(user) {
  if (!user) return false;
  if (user.isSuperAdmin || user.is_super_admin) return true;
  return ADMIN_ROLES.includes(user.role);
}

/**
 * Checks if a user has one of the allowed roles.
 * Church Admins automatically satisfy any staff role check.
 */
export function hasRole(user, allowedRoles) {
  if (!user) return false;
  if (isChurchAdmin(user)) return true;
  if (!allowedRoles || (Array.isArray(allowedRoles) && allowedRoles.length === 0)) return true;

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const userRole = user.role;

  return roles.some((r) => {
    if (r === userRole) return true;
    if (r === 'admin' && ADMIN_ROLES.includes(userRole)) return true;
    if (r === 'finance' && (userRole === 'finance' || userRole === 'accountant')) return true;
    if (r === 'pastor' && (userRole === 'pastor' || userRole === 'branch_pastor')) return true;
    return false;
  });
}

export function getRoleBadge(role) {
  return ROLE_DETAILS[role]?.badge || 'bg-gray-100 text-gray-600 border border-gray-200';
}

export function getRoleTitle(role) {
  return ROLE_DETAILS[role]?.title || (role ? role.replace(/_/g, ' ') : 'Staff');
}

export function getRoleDescription(role) {
  return ROLE_DETAILS[role]?.description || 'Church team member';
}
