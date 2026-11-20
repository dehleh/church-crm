-- ============================================================
-- 030_department_service_checklists.sql
-- Department & Unit Pre-Service Operational Checklists,
-- HOD Service Readiness Prompts, and Unit Member Notifications
-- ============================================================

-- 1. DEPARTMENT SERVICE CHECKLISTS
CREATE TABLE IF NOT EXISTS department_service_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  service_title VARCHAR(200) NOT NULL,
  service_date DATE NOT NULL,
  service_time VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'draft', -- draft | published | in_progress | completed
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  broadcast_sent_at TIMESTAMPTZ,
  broadcast_channels TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_checklists_main 
  ON department_service_checklists(church_id, department_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_dept_checklists_date 
  ON department_service_checklists(church_id, service_date);

-- 2. CHECKLIST ITEMS
CREATE TABLE IF NOT EXISTS department_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES department_service_checklists(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'General', -- Equipment | Logistics | Streaming | Audio | Sanctuary | Safety | General
  assigned_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  completed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_checklist_items_list 
  ON department_checklist_items(checklist_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_dept_checklist_items_assignee 
  ON department_checklist_items(assigned_member_id, is_completed);

-- 3. REUSABLE DEPARTMENT CHECKLIST TEMPLATES
CREATE TABLE IF NOT EXISTS department_checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  service_type VARCHAR(50) DEFAULT 'sunday', -- sunday | midweek | special
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_checklist_templates 
  ON department_checklist_templates(church_id, department_id);

-- 4. READINESS PROMPTS / ALERTS SENT TO HODs
CREATE TABLE IF NOT EXISTS department_readiness_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  hod_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  hod_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_service_date DATE NOT NULL,
  target_service_title VARCHAR(150) NOT NULL,
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app', -- in_app | email | whatsapp | sms
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, target_service_date, channel)
);

CREATE INDEX IF NOT EXISTS idx_dept_readiness_alerts 
  ON department_readiness_alerts(church_id, target_service_date);
