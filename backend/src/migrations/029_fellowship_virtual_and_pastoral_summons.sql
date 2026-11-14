-- ============================================================
-- 029_fellowship_virtual_and_pastoral_summons.sql
-- 1. Virtual & Hybrid Fellowship / Cell Meetings
-- 2. Pastoral Appointments & Summons System ("Pastor wants to see you")
-- ============================================================

-- 1. FELLOWSHIP / CELL CENTERS ENHANCEMENTS
-- Add meeting_type ('physical', 'virtual', 'hybrid') and meeting_link (Zoom, Meet, WhatsApp, etc.)
ALTER TABLE fellowship_centers ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(20) DEFAULT 'physical';
ALTER TABLE fellowship_centers ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500);

-- Make host_address nullable so virtual-only cells do not require a street address
ALTER TABLE fellowship_centers ALTER COLUMN host_address DROP NOT NULL;

-- 2. PASTORAL APPOINTMENTS & SUMMONS TABLE
CREATE TABLE IF NOT EXISTS pastoral_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  pastor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pastor_name VARCHAR(150),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'Pastoral Meeting Request',
  meeting_time TIMESTAMPTZ NOT NULL,
  venue VARCHAR(150) NOT NULL DEFAULT 'Pastor''s Office',
  urgency VARCHAR(30) DEFAULT 'normal', -- normal | high | urgent
  notes TEXT,
  status VARCHAR(30) DEFAULT 'pending', -- pending | acknowledged | completed | cancelled
  acknowledged_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  notification_channels TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pastoral_appts_church ON pastoral_appointments(church_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_appts_branch ON pastoral_appointments(branch_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_appts_member ON pastoral_appointments(member_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_appts_status ON pastoral_appointments(church_id, status);
CREATE INDEX IF NOT EXISTS idx_pastoral_appts_time ON pastoral_appointments(church_id, meeting_time);
