-- ============================================================
-- Migration 036: Add attendance_breakdown to events table
-- Enables rapid usher headcounts (Men, Women, Children, Visitors, Online, Sections)
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS attendance_breakdown JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_events_actual_attendance ON events(church_id, actual_attendance);
