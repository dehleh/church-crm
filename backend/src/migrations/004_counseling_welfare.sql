-- ============================================================
-- Migration 004: Counseling Sessions, Welfare Packages, Communication Images
-- ============================================================

-- Add image_url to communications
ALTER TABLE communications ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add 'visitor' to follow_up_status options (no constraint change needed, it's a varchar)

-- ============================================================
-- COUNSELING SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS counseling_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  first_timer_id UUID REFERENCES first_timers(id) ON DELETE SET NULL,
  requester_name VARCHAR(200),
  counselor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_type VARCHAR(50) DEFAULT 'general',         -- general | marital | spiritual | family | grief | career | other
  status VARCHAR(20) DEFAULT 'pending',               -- pending | scheduled | in_progress | completed | cancelled
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INT,
  notes TEXT,
  counselor_notes TEXT,
  is_confidential BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counseling_church ON counseling_sessions(church_id);
CREATE INDEX IF NOT EXISTS idx_counseling_status ON counseling_sessions(church_id, status);

-- ============================================================
-- WELFARE PACKAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS welfare_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  package_type VARCHAR(50) DEFAULT 'financial',       -- financial | food | medical | educational | housing | other
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS welfare_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES welfare_packages(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  first_timer_id UUID REFERENCES first_timers(id) ON DELETE SET NULL,
  applicant_name VARCHAR(200),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',               -- pending | under_review | approved | disbursed | rejected
  amount_requested NUMERIC(15, 2),
  amount_approved NUMERIC(15, 2),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_welfare_packages_church ON welfare_packages(church_id);
CREATE INDEX IF NOT EXISTS idx_welfare_apps_church ON welfare_applications(church_id);
CREATE INDEX IF NOT EXISTS idx_welfare_apps_status ON welfare_applications(church_id, status);
