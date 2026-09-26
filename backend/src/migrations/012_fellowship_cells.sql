-- ============================================================
-- 012_fellowship_cells.sql
-- House Fellowship, Care Cell, and Cluster System
-- ============================================================

-- 1. ZONES / DISTRICTS (Geographic areas)
CREATE TABLE IF NOT EXISTS fellowship_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  coordinator_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  target_areas TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_f_zones_church ON fellowship_zones(church_id);
CREATE INDEX IF NOT EXISTS idx_f_zones_branch ON fellowship_zones(branch_id);

-- 2. FELLOWSHIP / CELL CENTERS (Meeting hubs)
CREATE TABLE IF NOT EXISTS fellowship_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES fellowship_zones(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50),
  leader_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  assistant_leader_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  host_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  host_name VARCHAR(150),
  host_phone VARCHAR(30),
  host_address TEXT NOT NULL,
  landmark TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  meeting_day VARCHAR(20) DEFAULT 'Wednesday',
  meeting_time VARCHAR(20) DEFAULT '18:30',
  meeting_frequency VARCHAR(30) DEFAULT 'weekly',
  target_audience VARCHAR(50) DEFAULT 'general',
  max_capacity INT DEFAULT 15,
  status VARCHAR(30) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_f_centers_church ON fellowship_centers(church_id);
CREATE INDEX IF NOT EXISTS idx_f_centers_zone ON fellowship_centers(zone_id);
CREATE INDEX IF NOT EXISTS idx_f_centers_branch ON fellowship_centers(branch_id);
CREATE INDEX IF NOT EXISTS idx_f_centers_status ON fellowship_centers(status);

-- 3. FELLOWSHIP CENTER MEMBERS (Enrollment)
CREATE TABLE IF NOT EXISTS fellowship_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES fellowship_centers(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- member | leader | assistant_leader | host
  joined_at DATE DEFAULT CURRENT_DATE,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(center_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_f_members_center ON fellowship_members(center_id);
CREATE INDEX IF NOT EXISTS idx_f_members_member ON fellowship_members(member_id);
CREATE INDEX IF NOT EXISTS idx_f_members_church ON fellowship_members(church_id);

-- 4. WEEKLY MEETING REPORTS (Accountability, Headcount, Care & Giving)
CREATE TABLE IF NOT EXISTS fellowship_meeting_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES fellowship_centers(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  topic VARCHAR(255),
  facilitator VARCHAR(150),
  attendance_men INT DEFAULT 0,
  attendance_women INT DEFAULT 0,
  attendance_children INT DEFAULT 0,
  attendance_first_timers INT DEFAULT 0,
  total_attendance INT DEFAULT 0,
  offering_amount NUMERIC(12,2) DEFAULT 0.00,
  testimonies TEXT,
  prayer_requests TEXT,
  care_notes TEXT,
  submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'submitted', -- draft | submitted | reviewed
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_f_reports_church ON fellowship_meeting_reports(church_id);
CREATE INDEX IF NOT EXISTS idx_f_reports_center ON fellowship_meeting_reports(center_id);
CREATE INDEX IF NOT EXISTS idx_f_reports_date ON fellowship_meeting_reports(meeting_date);

-- 5. MEMBER JOIN REQUESTS (Self-service via Member Portal)
CREATE TABLE IF NOT EXISTS fellowship_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES fellowship_centers(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  request_note TEXT,
  status VARCHAR(30) DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_f_join_church ON fellowship_join_requests(church_id);
CREATE INDEX IF NOT EXISTS idx_f_join_center ON fellowship_join_requests(center_id);
CREATE INDEX IF NOT EXISTS idx_f_join_member ON fellowship_join_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_f_join_status ON fellowship_join_requests(status);
