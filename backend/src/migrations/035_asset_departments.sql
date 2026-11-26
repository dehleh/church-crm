-- ============================================================
-- 035: Asset Department Tagging & Jurisdiction Assignment
-- Allows assigning assets/equipment to specific church departments
-- (e.g., Media, Choir, Children's Church, Pastoral Care)
-- ============================================================

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assets_church_dept ON assets(church_id, department_id);
