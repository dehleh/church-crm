-- ============================================================
-- 006: Branch isolation + platform admin support
-- ============================================================

-- Add branch_id to groups & member_groups so groups are branch-scoped
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE member_groups
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groups_branch ON groups(branch_id);
CREATE INDEX IF NOT EXISTS idx_member_groups_branch ON member_groups(branch_id);

-- Backfill from member's branch where missing
UPDATE member_groups mg
SET branch_id = m.branch_id
FROM members m
WHERE mg.member_id = m.id AND mg.branch_id IS NULL;

-- ============================================================
-- Platform admin support
-- ============================================================
-- super_admin is a role that lives outside any single church but is still
-- attached to a church row (for FK simplicity). We add a flag so a single
-- query can find platform admins.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_super_admin
  ON users(is_super_admin) WHERE is_super_admin = true;

-- Audit log for platform-level actions
CREATE TABLE IF NOT EXISTS platform_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  target_church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_target
  ON platform_audit_log(target_church_id, created_at DESC);
