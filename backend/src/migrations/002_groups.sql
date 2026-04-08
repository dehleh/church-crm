-- ============================================================
-- GROUPS (extra-curricular / interest-based)
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  purpose VARCHAR(255),
  leader_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  meeting_schedule TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member ↔ Group (many-to-many)
CREATE TABLE IF NOT EXISTS member_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(member_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_groups_church ON groups(church_id);
CREATE INDEX IF NOT EXISTS idx_member_groups_group ON member_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_member_groups_member ON member_groups(member_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at ON groups;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
