-- ============================================================
-- 031_first_timers_decision_photos_and_friendship.sql
-- Decision to Join Church, Photo Captures, and Friendship Team Assignments
-- ============================================================

-- 1. First Timers Decision, Photos & Friendship Team Assignment
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS wants_to_join_church BOOLEAN DEFAULT false;
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS decision VARCHAR(50) DEFAULT 'considering';
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS assigned_member_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- 2. Indexes for conversion and demographic queries
CREATE INDEX IF NOT EXISTS idx_first_timers_wants_to_join ON first_timers(church_id, wants_to_join_church);
CREATE INDEX IF NOT EXISTS idx_first_timers_decision ON first_timers(church_id, decision);
CREATE INDEX IF NOT EXISTS idx_first_timers_assigned_member ON first_timers(church_id, assigned_member_id);
