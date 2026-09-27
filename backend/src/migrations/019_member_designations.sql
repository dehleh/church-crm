-- ============================================================
-- 019_member_designations.sql
-- Leadership designations (pastor, director, hod, minister, elder, worker, member)
-- and pastoral care covering
-- ============================================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS designation VARCHAR(50) DEFAULT 'member';
ALTER TABLE members ADD COLUMN IF NOT EXISTS leadership_title VARCHAR(150);
ALTER TABLE members ADD COLUMN IF NOT EXISTS assigned_pastor_id UUID REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_designation ON members(church_id, designation);
CREATE INDEX IF NOT EXISTS idx_members_assigned_pastor ON members(church_id, assigned_pastor_id);
