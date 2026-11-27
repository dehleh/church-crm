-- ============================================================
-- Migration 040: Granular Leadership KPIs, Course Assignments,
-- Video Studies, and Senior Pastor Verification Workflow
-- ============================================================

-- 1. ADD GRANULAR KPI FIELDS TO staff_okrs
ALTER TABLE staff_okrs
  ADD COLUMN IF NOT EXISTS kpi_category VARCHAR(50) DEFAULT 'core_leadership',
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES discipleship_courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS training_date DATE,
  ADD COLUMN IF NOT EXISTS training_venue VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reflection_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pastoral_feedback TEXT,
  ADD COLUMN IF NOT EXISTS last_reported_at TIMESTAMPTZ;

-- 2. INDEXES FOR PERFORMANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_staff_okrs_category ON staff_okrs(church_id, kpi_category);
CREATE INDEX IF NOT EXISTS idx_staff_okrs_verification ON staff_okrs(church_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_staff_okrs_course ON staff_okrs(church_id, course_id);
