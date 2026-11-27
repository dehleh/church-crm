-- ============================================================
-- Migration 038: Senior Pastor Role, Leadership OKRs & KPIs,
-- Testimonies Approval System, and Facility Incident Reporting
-- ============================================================

-- 1. DIRECTORS DEPARTMENT SUPERVISION
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS director_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_departments_director ON departments(church_id, director_id);

-- 2. LEADERSHIP OKRs & KPIs TABLE (Senior Pastor -> Directors & HODs)
CREATE TABLE IF NOT EXISTS staff_okrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_role VARCHAR(30) NOT NULL,              -- director | hod
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  period_type VARCHAR(30) DEFAULT 'quarterly',   -- annual | half_year | quarterly | monthly
  period_detail VARCHAR(100),                    -- e.g. "Q1 2026", "H1 2026", "Full Year 2026"
  fiscal_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  target_metric VARCHAR(255),                    -- e.g. "Attendance Growth", "Budget Adherence", "Volunteer Retention"
  target_value NUMERIC(12, 2) DEFAULT 100.00,
  current_value NUMERIC(12, 2) DEFAULT 0.00,
  progress_pct INT DEFAULT 0,                    -- 0 - 100%
  weight NUMERIC(5, 2) DEFAULT 1.0,              -- weight for average scoring
  status VARCHAR(30) DEFAULT 'in_progress',      -- in_progress | achieved | exceeded | lagging | closed
  key_results JSONB DEFAULT '[]',                -- [{ title, target, current, completed }]
  evaluator_notes TEXT,                          -- Senior Pastor / Lead Pastor review
  self_assessment_notes TEXT,                    -- Director / HOD feedback & evidence
  created_by UUID REFERENCES users(id),          -- Senior Pastor who set the OKR
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_okrs_user ON staff_okrs(church_id, user_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_staff_okrs_dept ON staff_okrs(church_id, department_id);

-- 3. TESTIMONIES & PRAISE REPORTS (Member submission & Pastoral approval for service)
CREATE TABLE IF NOT EXISTS testimonies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  submitter_name VARCHAR(255) NOT NULL,
  submitter_phone VARCHAR(50),
  submitter_email VARCHAR(150),
  is_anonymous BOOLEAN DEFAULT false,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'breakthrough',   -- healing | breakthrough | provision | salvation | deliverance | family | academic_career | fruit_of_the_womb | other
  testimony_date DATE DEFAULT CURRENT_DATE,
  photo_url TEXT,
  status VARCHAR(30) DEFAULT 'pending_review',   -- pending_review | approved_for_service | approved_online | shared_in_service | rejected | archived
  scheduled_service_date DATE,                   -- Date of Sunday celebration to share
  service_shared_at TIMESTAMPTZ,
  pastoral_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonies_status ON testimonies(church_id, status);
CREATE INDEX IF NOT EXISTS idx_testimonies_date ON testimonies(church_id, testimony_date);
CREATE INDEX IF NOT EXISTS idx_testimonies_member ON testimonies(church_id, member_id);

-- 4. FACILITY & ASSET WHISTLEBLOWER INCIDENT REPORTING
CREATE TABLE IF NOT EXISTS facility_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  facility_location VARCHAR(255) NOT NULL,       -- e.g. "Main Auditorium Gallery", "Restroom 1st floor", "Power generator house"
  issue_type VARCHAR(50) NOT NULL DEFAULT 'damage', -- damage | broken | vandalism_theft | malfunction | hazard | lost_item | other
  severity VARCHAR(30) DEFAULT 'medium',         -- critical | high | medium | low
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,                                -- Picture documenting the damage / condition
  is_anonymous BOOLEAN DEFAULT false,
  reporter_name VARCHAR(150),
  reporter_phone VARCHAR(50),
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'reported',         -- reported | investigating | under_repair | resolved | dismissed
  action_taken TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facility_incidents_status ON facility_incidents(church_id, status);
CREATE INDEX IF NOT EXISTS idx_facility_incidents_asset ON facility_incidents(asset_id);
