-- ============================================================
-- 014_member_intake_enhancements.sql
-- Children/Teenagers accounting, Worker unit tracking, Cell assignment
-- ============================================================

-- 1. Children & Teenagers Demographics
ALTER TABLE members ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS teenagers_count INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS children_details TEXT;

-- Sync num_children from 008 migration if present
UPDATE members
SET children_count = num_children, has_children = (num_children > 0)
WHERE (children_count = 0 OR children_count IS NULL) AND num_children > 0;

-- 2. Worker Status & Serving Unit
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_worker BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS worker_unit VARCHAR(150);
ALTER TABLE members ADD COLUMN IF NOT EXISTS worker_role VARCHAR(50) DEFAULT 'worker';

-- 3. Automatic Fellowship / Cell Center Assignment
ALTER TABLE members ADD COLUMN IF NOT EXISTS fellowship_cell_id UUID REFERENCES fellowship_centers(id) ON DELETE SET NULL;

-- 4. Birthday Celebration Tracking
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_birthday_wish_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_members_cell ON members(fellowship_cell_id);
CREATE INDEX IF NOT EXISTS idx_members_is_worker ON members(church_id, is_worker);
CREATE INDEX IF NOT EXISTS idx_members_children ON members(church_id, children_count, teenagers_count);
CREATE INDEX IF NOT EXISTS idx_members_bday_wish ON members(church_id, last_birthday_wish_year);
