const BRANCH_SCOPED_ROLES = ['branch_admin', 'branch_pastor'];

/**
 * Checks whether the current user is pinned to a single branch.
 */
const isBranchScopedUser = (req) => BRANCH_SCOPED_ROLES.includes(req.user?.role);

/**
 * Resolves the effective branch ID for write operations.
 * Branch-scoped users (branch_admin / branch_pastor) are strictly pinned to req.branchId.
 */
const resolveWriteBranchId = (req, bodyBranchId) => {
  if (isBranchScopedUser(req)) {
    return req.branchId || null;
  }
  return bodyBranchId || req.branchId || null;
};

/**
 * Appends a parameterized branch filter to SQL conditions when req.branchId is active.
 */
const applyBranchFilter = (req, column, conditions, params, idx, { allowNullBranch = false } = {}) => {
  if (!req.branchId) return idx;
  if (allowNullBranch) {
    conditions.push(`(${column} = $${idx} OR ${column} IS NULL)`);
  } else {
    conditions.push(`${column} = $${idx}`);
  }
  params.push(req.branchId);
  return idx + 1;
};

module.exports = {
  BRANCH_SCOPED_ROLES,
  isBranchScopedUser,
  resolveWriteBranchId,
  applyBranchFilter,
};

