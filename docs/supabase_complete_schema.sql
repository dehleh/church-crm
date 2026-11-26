-- =========================================================================
-- ChurchOS Complete Database Schema for Supabase (PostgreSQL 15/16)
-- Auto-Generated Consolidated Schema
-- Execute directly in the Supabase SQL Editor
-- =========================================================================



-- =========================================================================
-- Migration: 001_initial_schema.sql
-- =========================================================================
-- ============================================================
-- ChurchOS — Full Database Schema
-- Multi-tenant: every table has church_id (tenant key)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS / CHURCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,          -- used in subdomain / URL
  logo_url TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Nigeria',
  phone VARCHAR(30),
  email VARCHAR(255),
  website VARCHAR(255),
  denomination VARCHAR(100),
  founded_year INT,
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  currency VARCHAR(10) DEFAULT 'NGN',
  subscription_plan VARCHAR(30) DEFAULT 'free', -- free | starter | pro | enterprise
  subscription_status VARCHAR(20) DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BRANCHES (per church)
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(255),
  pastor_name VARCHAR(255),
  is_headquarters BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (staff / admins per church)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(30),
  avatar_url TEXT,
  role VARCHAR(30) NOT NULL DEFAULT 'hod',   -- head_pastor | pastor | director | hod | member
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, email)
);

-- ============================================================
-- MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  member_number VARCHAR(50),                  -- auto-generated church member ID
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(30),
  phone_alt VARCHAR(30),
  date_of_birth DATE,
  gender VARCHAR(10),                          -- male | female | other
  marital_status VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  occupation VARCHAR(150),
  employer VARCHAR(200),
  profile_photo_url TEXT,
  membership_status VARCHAR(30) DEFAULT 'active', -- active | inactive | transferred | deceased
  membership_class VARCHAR(30) DEFAULT 'full',    -- full | associate | child | youth
  join_date DATE,
  baptism_date DATE,
  water_baptized BOOLEAN DEFAULT false,
  holy_ghost_baptized BOOLEAN DEFAULT false,
  salvation_date DATE,
  next_of_kin_name VARCHAR(200),
  next_of_kin_phone VARCHAR(30),
  next_of_kin_relationship VARCHAR(50),
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FIRST TIMERS / VISITORS
-- ============================================================
CREATE TABLE IF NOT EXISTS first_timers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  address TEXT,
  gender VARCHAR(10),
  date_of_birth DATE,
  how_did_you_hear VARCHAR(100),              -- social media | friend | walk-in | online service
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_attended VARCHAR(100),
  follow_up_status VARCHAR(30) DEFAULT 'pending', -- pending | contacted | converted | inactive
  follow_up_assigned_to UUID REFERENCES users(id),
  follow_up_notes TEXT,
  converted_to_member BOOLEAN DEFAULT false,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  prayer_request TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEPARTMENTS / UNITS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,  -- NULL = church-wide
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),                        -- ministry | service | admin | media | music | welfare
  head_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  meeting_schedule TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member ↔ Department (many-to-many)
CREATE TABLE IF NOT EXISTS member_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',           -- member | leader | coordinator
  joined_at DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(member_id, department_id)
);

-- ============================================================
-- EVENTS / SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50),                      -- sunday_service | midweek | special | conference | outreach | concert
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  location VARCHAR(255),
  is_online BOOLEAN DEFAULT false,
  online_link TEXT,
  expected_attendance INT,
  actual_attendance INT,
  status VARCHAR(20) DEFAULT 'upcoming',       -- upcoming | ongoing | completed | cancelled
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  first_timer_id UUID REFERENCES first_timers(id) ON DELETE SET NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_method VARCHAR(30) DEFAULT 'manual', -- manual | qr | card | app
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCE — ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  account_type VARCHAR(30),                    -- bank | cash | mobile_money | savings
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  balance NUMERIC(15, 2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'NGN',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCE — GIVING CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS giving_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,                  -- tithe | offering | seed | project | welfare
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCE — TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES giving_categories(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  transaction_type VARCHAR(20) NOT NULL,       -- income | expense | transfer
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  description TEXT,
  reference VARCHAR(100),
  payment_method VARCHAR(30),                  -- cash | transfer | card | cheque | ussd
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'completed',      -- pending | completed | cancelled | reversed
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCE — BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  period_type VARCHAR(20),                     -- monthly | quarterly | annual
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount NUMERIC(15, 2) NOT NULL,
  spent_amount NUMERIC(15, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEDIA
-- ============================================================
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  media_type VARCHAR(30),                      -- sermon | worship | video | podcast | document | image
  file_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  file_size_bytes BIGINT,
  minister_name VARCHAR(150),
  series_name VARCHAR(150),
  scripture_reference VARCHAR(200),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRAYER REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  first_timer_id UUID REFERENCES first_timers(id) ON DELETE SET NULL,
  requester_name VARCHAR(200),                 -- for anonymous or guest requests
  request TEXT NOT NULL,
  category VARCHAR(50),                        -- healing | finances | family | salvation | others
  is_anonymous BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'open',           -- open | praying | answered | closed
  assigned_to UUID REFERENCES users(id),
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASTORAL CARE / FOLLOW-UP
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  first_timer_id UUID REFERENCES first_timers(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  follow_up_type VARCHAR(30),                  -- call | visit | email | sms | whatsapp
  status VARCHAR(20) DEFAULT 'pending',        -- pending | in_progress | completed | failed
  notes TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMUNICATION / ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  channel VARCHAR(30),                         -- email | sms | push | whatsapp | in_app
  audience VARCHAR(30) DEFAULT 'all',          -- all | members | department | branch | custom
  audience_filter JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft',          -- draft | scheduled | sent | failed
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_members_church ON members(church_id);
CREATE INDEX IF NOT EXISTS idx_members_branch ON members(branch_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_first_timers_church ON first_timers(church_id);
CREATE INDEX IF NOT EXISTS idx_first_timers_follow_up ON first_timers(follow_up_status);
CREATE INDEX IF NOT EXISTS idx_events_church ON events(church_id);
CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_church ON transactions(church_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_departments_church ON departments(church_id);
CREATE INDEX IF NOT EXISTS idx_media_church ON media_items(church_id);
CREATE INDEX IF NOT EXISTS idx_prayer_church ON prayer_requests(church_id);
CREATE INDEX IF NOT EXISTS idx_audit_church ON audit_logs(church_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_users_church_email ON users(church_id, email);
CREATE INDEX IF NOT EXISTS idx_branches_church ON branches(church_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'churches','branches','users','members','first_timers',
    'departments','events','finance_accounts','transactions',
    'budgets','media_items','prayer_requests','follow_ups','communications'
  ]) LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END;
$$;


-- =========================================================================
-- Migration: 002_groups.sql
-- =========================================================================
-- ============================================================
-- GROUPS (extra-curricular / interest-based)
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  purpose VARCHAR(255),
  leader_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  meeting_schedule TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member ↔ Group (many-to-many)
CREATE TABLE IF NOT EXISTS member_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(member_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_groups_church ON groups(church_id);
CREATE INDEX IF NOT EXISTS idx_member_groups_group ON member_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_member_groups_member ON member_groups(member_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at ON groups;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =========================================================================
-- Migration: 002_security_columns.sql
-- =========================================================================
-- ============================================================
-- 002: Security hardening columns
-- ============================================================

-- Login lockout columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Force password change flag (for invited users / password resets)
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- Unique constraint on attendance to support ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_event_member_unique'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_event_member_unique UNIQUE (event_id, member_id);
  END IF;
END $$;


-- =========================================================================
-- Migration: 003_assets.sql
-- =========================================================================
-- ============================================================
-- 003: Church Assets / Inventory Management
-- ============================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  -- e.g. furniture, musical_instrument, electronics, vehicle, building, equipment, other
  asset_tag VARCHAR(50),         -- optional internal tracking code
  quantity INT DEFAULT 1,
  condition VARCHAR(30) DEFAULT 'good',
  -- good, fair, poor, needs_repair, decommissioned
  status VARCHAR(30) DEFAULT 'active',
  -- active, in_use, in_storage, under_repair, disposed
  purchase_date DATE,
  purchase_price DECIMAL(15, 2),
  current_value DECIMAL(15, 2),
  location VARCHAR(255),         -- e.g. "Main Auditorium", "Store Room A"
  custodian_id UUID REFERENCES members(id),  -- who is in charge
  notes TEXT,
  photo_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_church ON assets(church_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(church_id, category);
CREATE INDEX IF NOT EXISTS idx_assets_custodian ON assets(custodian_id);


-- =========================================================================
-- Migration: 004_counseling_welfare.sql
-- =========================================================================
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


-- =========================================================================
-- Migration: 005_procurement.sql
-- =========================================================================
-- ============================================================
-- Migration 005: Requisitions & Purchase Requests (Procurement)
-- ============================================================

-- Monthly requisitions raised by procurement/admin officer
CREATE TABLE IF NOT EXISTS requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  requisition_month DATE NOT NULL,                    -- first day of month, e.g. 2026-04-01
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',                 -- draft | submitted | approved | rejected
  items JSONB DEFAULT '[]',                           -- [{name, quantity, unitPrice, total}]
  raised_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requisitions_church ON requisitions(church_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(church_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_month ON requisitions(church_id, requisition_month);

-- Purchase requests / tickets raised by procurement/admin → finance
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  requisition_id UUID REFERENCES requisitions(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  vendor_name VARCHAR(200),
  items JSONB DEFAULT '[]',                           -- [{name, quantity, unitPrice, total}]
  total_amount NUMERIC(15, 2) DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'normal',              -- low | normal | high | urgent
  status VARCHAR(20) DEFAULT 'pending',               -- pending | reviewed | approved | purchased | rejected
  raised_by UUID NOT NULL REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_req_church ON purchase_requests(church_id);
CREATE INDEX IF NOT EXISTS idx_purchase_req_status ON purchase_requests(church_id, status);


-- =========================================================================
-- Migration: 006_branch_isolation.sql
-- =========================================================================
-- ============================================================
-- 006: Branch isolation + platform admin support
-- ============================================================

-- Add branch_id to groups & member_groups so groups are branch-scoped
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE member_groups
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groups_branch ON groups(branch_id);
CREATE INDEX IF NOT EXISTS idx_member_groups_branch ON member_groups(branch_id);

-- Backfill from member's branch where missing
UPDATE member_groups mg
SET branch_id = m.branch_id
FROM members m
WHERE mg.member_id = m.id AND mg.branch_id IS NULL;

-- ============================================================
-- Platform admin support
-- ============================================================
-- super_admin is a role that lives outside any single church but is still
-- attached to a church row (for FK simplicity). We add a flag so a single
-- query can find platform admins.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_super_admin
  ON users(is_super_admin) WHERE is_super_admin = true;

-- Audit log for platform-level actions
CREATE TABLE IF NOT EXISTS platform_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  target_church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_target
  ON platform_audit_log(target_church_id, created_at DESC);


-- =========================================================================
-- Migration: 007_contact_submissions.sql
-- =========================================================================
-- Marketing site contact submissions (no church_id; pre-signup leads)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  church TEXT,
  message TEXT NOT NULL,
  source TEXT DEFAULT 'landing',
  ip TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);


-- =========================================================================
-- Migration: 008_family_fields.sql
-- =========================================================================
-- Family / lifecycle fields used for communication audience filters
ALTER TABLE members ADD COLUMN IF NOT EXISTS wedding_anniversary_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS num_children INTEGER DEFAULT 0;

-- Speed up date-based audience queries (birthday / anniversary blasts).
-- to_char() is not IMMUTABLE; use EXTRACT(month/day) which is.
CREATE INDEX IF NOT EXISTS idx_members_dob_md
  ON members ((EXTRACT(MONTH FROM date_of_birth)), (EXTRACT(DAY FROM date_of_birth)))
  WHERE date_of_birth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_anniv_md
  ON members ((EXTRACT(MONTH FROM wedding_anniversary_date)), (EXTRACT(DAY FROM wedding_anniversary_date)))
  WHERE wedding_anniversary_date IS NOT NULL;


-- =========================================================================
-- Migration: 009_member_portal.sql
-- =========================================================================
-- Member-facing portal: per-member credentials and login tracking.
-- Per-church enablement lives in churches.settings.member_portal_enabled (JSONB).
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portal_invited_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portal_last_login_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portal_refresh_token TEXT;

-- Email + church should be unique among portal-enabled members so login is unambiguous.
CREATE INDEX IF NOT EXISTS idx_members_email_lower
  ON members ((LOWER(email))) WHERE email IS NOT NULL;


-- =========================================================================
-- Migration: 010_subscriptions.sql
-- =========================================================================
-- ============================================================
-- 010_subscriptions.sql
-- Multi-tenancy toggle, license whitelist, plan limits
-- ============================================================

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS multi_branch_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_whitelisted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_key TEXT,
  ADD COLUMN IF NOT EXISTS license_notes TEXT,
  ADD COLUMN IF NOT EXISTS branch_limit INT,
  ADD COLUMN IF NOT EXISTS member_limit INT;

-- Standardize plan values going forward: starter | growth | enterprise
-- (legacy values like 'free' / 'pro' are tolerated; super-admin can update them)

-- Subscription transactions / payment audit log
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL DEFAULT 'paystack',
  reference VARCHAR(255) UNIQUE,
  plan VARCHAR(30),
  amount_kobo BIGINT,
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending | success | failed
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_tx_church ON subscription_transactions(church_id);
CREATE INDEX IF NOT EXISTS idx_sub_tx_status ON subscription_transactions(status);


-- =========================================================================
-- Migration: 011_license_requests.sql
-- =========================================================================
-- License purchase requests (sales leads) submitted from public landing page
CREATE TABLE IF NOT EXISTS license_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_name        VARCHAR(255) NOT NULL,
  contact_name       VARCHAR(255) NOT NULL,
  admin_email        VARCHAR(255) NOT NULL,
  phone              VARCHAR(50),
  country            VARCHAR(100),
  plan               VARCHAR(30) NOT NULL,           -- starter | growth | enterprise
  branches_estimate  INT,
  members_estimate   INT,
  message            TEXT,
  status             VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | contacted | approved | rejected
  notes              TEXT,
  processed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_requests_status   ON license_requests(status);
CREATE INDEX IF NOT EXISTS idx_license_requests_created  ON license_requests(created_at DESC);


-- =========================================================================
-- Migration: 012_fellowship_cells.sql
-- =========================================================================
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


-- =========================================================================
-- Migration: 013_branding_and_reminders.sql
-- =========================================================================
-- ============================================================
-- 013_branding_and_reminders.sql
-- Church Branding, Pastors Showcase, Event Banners & Automated Reminders
-- ============================================================

-- 1. CHURCH PROFILE BRANDING & LEADERSHIP
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS mission TEXT,
  ADD COLUMN IF NOT EXISTS vision TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pastors JSONB DEFAULT '[]';

-- 2. EVENT BANNERS & AUTOMATED REMINDERS
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_time_before VARCHAR(30) DEFAULT '24h', -- 24h | 2h | 1h | morning_of
  ADD COLUMN IF NOT EXISTS reminder_channels TEXT[] DEFAULT '{"whatsapp"}', -- whatsapp | email | sms
  ADD COLUMN IF NOT EXISTS reminder_target VARCHAR(30) DEFAULT 'all_members', -- all_members | attendees | branch
  ADD COLUMN IF NOT EXISTS reminder_custom_text TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_reminder ON events(reminder_enabled, reminder_sent_at, start_datetime);

-- 3. COMMUNICATIONS SCHEDULED STATUS
CREATE INDEX IF NOT EXISTS idx_communications_scheduled ON communications(status, scheduled_at);


-- =========================================================================
-- Migration: 014_member_intake_enhancements.sql
-- =========================================================================
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


-- =========================================================================
-- Migration: 015_discipleship_and_devotionals.sql
-- =========================================================================
-- Migration 015: Discipleship Training School and Daily Devotionals System

-- 1. Discipleship Courses / Programs
CREATE TABLE IF NOT EXISTS discipleship_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  category VARCHAR(100) DEFAULT 'foundation', -- 'foundation', 'discipleship', 'leadership', 'workers', 'bible_study'
  level VARCHAR(50) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  cover_image_url TEXT,
  instructor_name VARCHAR(255),
  duration_weeks INT DEFAULT 4,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Discipleship Lessons / Modules
CREATE TABLE IF NOT EXISTS discipleship_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES discipleship_courses(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  scripture_references TEXT,
  video_url TEXT,
  audio_url TEXT,
  order_num INT DEFAULT 1,
  duration_minutes INT DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Member Course Enrollments
CREATE TABLE IF NOT EXISTS discipleship_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES discipleship_courses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'dropped'
  progress_percent INT DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  certificate_code VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, member_id)
);

-- 4. Member Lesson Progress
CREATE TABLE IF NOT EXISTS discipleship_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES discipleship_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES discipleship_lessons(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  reflection_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);

-- 5. Daily Devotionals
CREATE TABLE IF NOT EXISTS daily_devotionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  theme_scripture VARCHAR(255) NOT NULL,
  scripture_text TEXT,
  content TEXT NOT NULL,
  confession TEXT,
  prayer_point TEXT,
  bible_reading_plan VARCHAR(255),
  author VARCHAR(255),
  is_published BOOLEAN DEFAULT true,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, date)
);

-- 6. Member Devotional Reads & Bookmarks
CREATE TABLE IF NOT EXISTS devotional_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  devotional_id UUID NOT NULL REFERENCES daily_devotionals(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(devotional_id, member_id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_disc_courses_church ON discipleship_courses(church_id);
CREATE INDEX IF NOT EXISTS idx_disc_lessons_course ON discipleship_lessons(course_id, order_num);
CREATE INDEX IF NOT EXISTS idx_disc_enroll_member ON discipleship_enrollments(member_id, status);
CREATE INDEX IF NOT EXISTS idx_disc_prog_enroll ON discipleship_lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_devotionals_church_date ON daily_devotionals(church_id, date);


-- =========================================================================
-- Migration: 016_ensure_platform_superadmin.sql
-- =========================================================================
-- ============================================================
-- 016: Ensure Platform Operations Tenant Exists
-- (Platform Super Admin provisioning is driven by PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD env vars.)
-- ============================================================

DO $$
DECLARE
  v_church_id UUID;
BEGIN
  SELECT id INTO v_church_id FROM churches ORDER BY created_at ASC LIMIT 1;

  IF v_church_id IS NULL THEN
    BEGIN
      v_church_id := gen_random_uuid();
    EXCEPTION WHEN undefined_function THEN
      v_church_id := uuid_generate_v4();
    END;

    INSERT INTO churches (id, name, slug, subscription_plan, is_active)
    VALUES (v_church_id, 'Platform Operations', 'platform-ops', 'enterprise', true);
  END IF;
END $$;


-- =========================================================================
-- Migration: 017_online_giving_and_2fa.sql
-- =========================================================================
-- ============================================================
-- 017: Online Giving Transactions, 2FA Security, and Church Audit Logging
-- ============================================================

-- 1. Two-Factor Authentication columns on users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS two_factor_temp_secret TEXT;

CREATE INDEX IF NOT EXISTS idx_users_2fa_enabled ON users(two_factor_enabled) WHERE two_factor_enabled = true;

-- 2. Payment Gateway Configuration column on churches table
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}'::jsonb;

-- 3. Online Giving Transactions table
CREATE TABLE IF NOT EXISTS online_giving_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  donor_name VARCHAR(150),
  donor_email VARCHAR(255),
  donor_phone VARCHAR(50),
  category_id UUID REFERENCES giving_categories(id) ON DELETE SET NULL,
  category_name VARCHAR(100),
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  gateway VARCHAR(50) DEFAULT 'paystack', -- 'paystack' | 'flutterwave' | 'stripe'
  reference VARCHAR(120) UNIQUE NOT NULL,
  gateway_reference VARCHAR(255),
  status VARCHAR(30) DEFAULT 'pending', -- 'pending' | 'successful' | 'failed' | 'abandoned'
  is_anonymous BOOLEAN DEFAULT false,
  notes TEXT,
  receipt_number VARCHAR(60),
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_giving_church_status ON online_giving_transactions(church_id, status);
CREATE INDEX IF NOT EXISTS idx_giving_member ON online_giving_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_giving_reference ON online_giving_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_giving_created ON online_giving_transactions(created_at DESC);

-- 4. Church-level Audit Logs table
CREATE TABLE IF NOT EXISTS church_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(150),
  actor_email VARCHAR(255),
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(60) NOT NULL,
  resource_id VARCHAR(100),
  ip_address VARCHAR(50),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_church_audit_logs ON church_audit_logs(church_id, created_at DESC);


-- =========================================================================
-- Migration: 018_giving_campaigns.sql
-- =========================================================================
-- ============================================================
-- 018: Giving Campaigns, Projects, Programs & Fundraisers
-- ============================================================

-- 1. Create giving_campaigns table
CREATE TABLE IF NOT EXISTS giving_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  category_id UUID REFERENCES giving_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'project', -- 'project' | 'event' | 'program' | 'building' | 'missions' | 'welfare' | 'equipment' | 'pledge' | 'general'
  description TEXT,
  scripture_text VARCHAR(255),
  target_amount NUMERIC(15, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'NGN',
  banner_url TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'completed' | 'paused' | 'draft'
  allow_public_donations BOOLEAN DEFAULT true,
  allow_member_portal BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint for slug per church
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_church_slug ON giving_campaigns(church_id, slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_church_status ON giving_campaigns(church_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_event ON giving_campaigns(event_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON giving_campaigns(category_id);

-- 2. Link transactions to giving campaigns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES giving_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_campaign ON transactions(campaign_id);

-- 3. Link online giving transactions to giving campaigns
ALTER TABLE online_giving_transactions
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES giving_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_online_giving_campaign ON online_giving_transactions(campaign_id);


-- =========================================================================
-- Migration: 019_member_designations.sql
-- =========================================================================
-- ============================================================
-- 019_member_designations.sql
-- Leadership designations (pastor, director, hod, minister, elder, worker, member)
-- and pastoral care covering
-- ============================================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS designation VARCHAR(50) DEFAULT 'member';
ALTER TABLE members ADD COLUMN IF NOT EXISTS leadership_title VARCHAR(150);
ALTER TABLE members ADD COLUMN IF NOT EXISTS assigned_pastor_id UUID REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_designation ON members(church_id, designation);
CREATE INDEX IF NOT EXISTS idx_members_assigned_pastor ON members(church_id, assigned_pastor_id);


-- =========================================================================
-- Migration: 020_protect_platform_superadmin.sql
-- =========================================================================
-- ============================================================
-- 020: Protect Platform Operations Tenant & Super Admin Accounts
-- Prevents cascade-deletion of super admin accounts when a church is deleted.
-- ============================================================

-- 1. Add is_system flag to churches table
ALTER TABLE churches ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- 2. Ensure dedicated, immutable system tenant exists
INSERT INTO churches (id, name, slug, subscription_plan, is_active, is_system)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ChurchOS Platform Operations',
  'platform-operations-system',
  'enterprise',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET is_system = true, is_active = true;

-- Also mark any existing platform-ops church as system
UPDATE churches SET is_system = true WHERE slug IN ('platform-ops', 'platform-operations-system');

-- 3. Allow church_id on users to be nullable for safety
ALTER TABLE users ALTER COLUMN church_id DROP NOT NULL;

-- 4. Reassign any existing superadmin accounts to the dedicated system church
UPDATE users
SET church_id = '00000000-0000-0000-0000-000000000001'
WHERE is_super_admin = true;


-- =========================================================================
-- Migration: 021_first_timer_automation.sql
-- =========================================================================
-- ============================================================
-- 021: First-Timer Automated Follow-Up Sequences & Queue
-- ============================================================

CREATE TABLE IF NOT EXISTS first_timer_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Standard 3-Step Visitor Follow-Up',
  is_active BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[
    {
      "step": 1,
      "delayHours": 2,
      "channel": "whatsapp",
      "template": "Dear {{firstName}}, thank you for worshiping with us at {{churchName}} today! We were truly blessed to have you in service. Pastor {{pastorName}} and the entire church family welcome you warmly. We pray that God meets you at your point of need. Have a glorious week!"
    },
    {
      "step": 2,
      "delayHours": 72,
      "channel": "sms",
      "template": "Hello {{firstName}}! Pastor {{pastorName}} and your {{churchName}} family are praying for you this week. If you have any prayer requests or need counseling, feel free to reply or visit us again this Sunday!"
    },
    {
      "step": 3,
      "delayHours": 144,
      "channel": "whatsapp",
      "template": "Happy weekend {{firstName}}! We are looking forward to having you with us again this Sunday at {{churchName}}. Join us for an inspiring time in God''s presence. Service starts at 9:00 AM. See you there!"
    }
  ]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id)
);

CREATE TABLE IF NOT EXISTS first_timer_sequence_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  first_timer_id UUID NOT NULL REFERENCES first_timers(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp', -- whatsapp | sms | email
  recipient_phone VARCHAR(50),
  recipient_email VARCHAR(255),
  message_body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled', -- scheduled | sent | failed | cancelled | skipped
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ft_sequence_queue_status_sched
  ON first_timer_sequence_queue(status, scheduled_for)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_ft_sequence_queue_church_ft
  ON first_timer_sequence_queue(church_id, first_timer_id);


-- =========================================================================
-- Migration: 022_services_and_dva.sql
-- =========================================================================
-- ============================================================
-- 022: Sunday Service Run-Sheets, Volunteer Rosters & Dedicated Virtual Accounts
-- ============================================================

-- 1. Service Plans (Order of Service & Run-Sheet)
CREATE TABLE IF NOT EXISTS service_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  service_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  theme VARCHAR(255),
  series_title VARCHAR(255),
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'published', -- draft | published | completed
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_plans_church_date
  ON service_plans(church_id, service_date DESC);

-- 2. Service Order Items (Minute-by-minute Timeline)
CREATE TABLE IF NOT EXISTS service_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 10,
  title VARCHAR(255) NOT NULL,
  item_type VARCHAR(50) NOT NULL DEFAULT 'general', -- prayer | worship | word | giving | announcement | special
  minister_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_order_items_plan
  ON service_order_items(plan_id, sort_order ASC);

-- 3. Service Volunteers (Roster & Scheduling)
CREATE TABLE IF NOT EXISTS service_volunteers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  role_title VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'assigned', -- assigned | confirmed | declined
  notes TEXT,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_volunteers_plan
  ON service_volunteers(plan_id, member_id);

-- 4. Member Dedicated Virtual Bank Accounts (Direct Bank Transfer Giving)
CREATE TABLE IF NOT EXISTS member_virtual_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL DEFAULT 'Wema Bank',
  account_number VARCHAR(30) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  paystack_customer_code VARCHAR(100),
  paystack_dedicated_account_id VARCHAR(100),
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, member_id),
  UNIQUE (account_number)
);

CREATE INDEX IF NOT EXISTS idx_member_virtual_accounts_church
  ON member_virtual_accounts(church_id, member_id);

-- Add channel / virtual account reference to transactions if not present
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(30);


-- =========================================================================
-- Migration: 023_push_and_notifications.sql
-- =========================================================================
-- ============================================================
-- 023: Web Push Subscriptions & Member Notification Preferences
-- ============================================================

-- 1. Browser Web Push Subscriptions (Mobile & Desktop Phone Push)
CREATE TABLE IF NOT EXISTS member_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_push_subs_member
  ON member_push_subscriptions(church_id, member_id);

-- 2. Member Notification Channel & Topic Preferences
CREATE TABLE IF NOT EXISTS member_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  notify_devotionals BOOLEAN NOT NULL DEFAULT true,
  notify_prayers BOOLEAN NOT NULL DEFAULT true,
  notify_announcements BOOLEAN NOT NULL DEFAULT true,
  notify_events BOOLEAN NOT NULL DEFAULT true,
  notify_giving BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_member_notif_prefs_church
  ON member_notification_preferences(church_id, member_id);

-- 3. Add dispatch tracking to daily_devotionals
ALTER TABLE daily_devotionals
  ADD COLUMN IF NOT EXISTS morning_pushed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS morning_emailed_at TIMESTAMPTZ;


-- =========================================================================
-- Migration: 024_anniversary_and_onboarding.sql
-- =========================================================================
-- ============================================================
-- 024_anniversary_and_onboarding.sql
-- Wedding Anniversary Wishes Automation & Member Onboarding Tokens
-- ============================================================

-- 1. TRACKING OF SENT WEDDING ANNIVERSARY WISHES
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_anniversary_wish_year INTEGER;
CREATE INDEX IF NOT EXISTS idx_members_anniv_wish ON members(church_id, last_anniversary_wish_year);

-- 2. MEMBER ONBOARDING / SET PASSWORD TOKEN
ALTER TABLE members ADD COLUMN IF NOT EXISTS set_password_token VARCHAR(255);
ALTER TABLE members ADD COLUMN IF NOT EXISTS set_password_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_members_set_pwd_token ON members(set_password_token) WHERE set_password_token IS NOT NULL;


-- =========================================================================
-- Migration: 025_family_units_and_spouse_linking.sql
-- =========================================================================
-- ============================================================
-- 025_family_units_and_spouse_linking.sql
-- Family Household Units, Bidirectional Spouse Linking, and Children Deduplication
-- ============================================================

-- 1. Family Unit and Spouse columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS family_id UUID;
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(255);
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_phone VARCHAR(50);
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_primary_family_contact BOOLEAN DEFAULT true;
ALTER TABLE members ADD COLUMN IF NOT EXISTS family_role VARCHAR(50) DEFAULT 'head';

-- 2. Indexes for fast household matching and query performance
CREATE INDEX IF NOT EXISTS idx_members_family ON members(church_id, family_id);
CREATE INDEX IF NOT EXISTS idx_members_spouse ON members(church_id, spouse_id);
CREATE INDEX IF NOT EXISTS idx_members_spouse_phone ON members(church_id, spouse_phone);
CREATE INDEX IF NOT EXISTS idx_members_primary_contact ON members(church_id, is_primary_family_contact);

-- 3. Initialize family_id for all existing members if not set
UPDATE members
SET family_id = id
WHERE family_id IS NULL;

-- 4. Automatically link any existing married couples who share the exact same address and wedding anniversary date
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT m1.id as id1, m2.id as id2, m1.family_id as fam_id
    FROM members m1
    JOIN members m2 ON m1.church_id = m2.church_id
      AND m1.id < m2.id
      AND m1.marital_status = 'married'
      AND m2.marital_status = 'married'
      AND m1.wedding_anniversary_date IS NOT NULL
      AND m1.wedding_anniversary_date = m2.wedding_anniversary_date
      AND LOWER(TRIM(m1.address)) = LOWER(TRIM(m2.address))
    WHERE m1.spouse_id IS NULL AND m2.spouse_id IS NULL
  ) LOOP
    -- Link spouses bidirectionally and group into m1's family_id
    UPDATE members SET spouse_id = rec.id2, family_id = rec.fam_id WHERE id = rec.id1;
    UPDATE members SET spouse_id = rec.id1, family_id = rec.fam_id, is_primary_family_contact = false WHERE id = rec.id2;
  END LOOP;
END $$;


-- =========================================================================
-- Migration: 026_requisition_workflow_and_disbursements.sql
-- =========================================================================
-- ============================================================
-- Migration 026: Requisition Workflow & Disbursement Integration
-- Supports enhanced statuses: 'draft', 'submitted', 'approved', 'disputed', 'correction', 'rejected', 'disbursed'
-- ============================================================

ALTER TABLE requisitions
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS disputed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correction_notes TEXT,
  ADD COLUMN IF NOT EXISTS returned_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS disbursed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disbursement_amount NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS disbursement_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS disbursement_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS disbursement_details JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requisitions_disbursed ON requisitions(church_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_disb_ref ON requisitions(disbursement_reference);


-- =========================================================================
-- Migration: 027_robustness_and_scalability.sql
-- =========================================================================
-- ============================================================
-- 027_robustness_and_scalability.sql
-- Database integrity, atomic sequential counters, idempotency,
-- and full-text / trigram search performance.
-- ============================================================

-- 1. ATOMIC TENANT COUNTERS (Prevents duplicate member numbers & race conditions)
CREATE TABLE IF NOT EXISTS church_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  counter_type VARCHAR(50) NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, counter_type)
);

CREATE INDEX IF NOT EXISTS idx_church_counters_lookup ON church_counters(church_id, counter_type);

-- Seed member_number counter for all existing churches
INSERT INTO church_counters (church_id, counter_type, current_value)
SELECT
  c.id,
  'member_number',
  COALESCE(
    (
      SELECT MAX(
        CASE
          WHEN m.member_number ~ '^[A-Za-z]+-[0-9]+$' THEN SUBSTRING(m.member_number FROM '[0-9]+')::BIGINT
          ELSE NULL
        END
      )
      FROM members m
      WHERE m.church_id = c.id
    ),
    (SELECT COUNT(*) FROM members m WHERE m.church_id = c.id),
    0
  )
FROM churches c
ON CONFLICT (church_id, counter_type) DO NOTHING;

-- 2. DEDUPLICATION / UNIQUE CONSTRAINTS
-- Prevent duplicate member numbers within the same church
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_church_member_num
ON members(church_id, member_number)
WHERE member_number IS NOT NULL;

-- Ensure transaction references are unique per church for idempotent accounting
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_church_ref
ON transactions(church_id, reference)
WHERE reference IS NOT NULL;

-- 3. WEBHOOK IDEMPOTENCY STORE (Prevents duplicate processing on retries)
CREATE TABLE IF NOT EXISTS processed_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  event_id VARCHAR(150) NOT NULL,
  payload_hash VARCHAR(64),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_lookup ON processed_webhooks(provider, event_id);

-- 4. SEARCH SCALABILITY (pg_trgm for fast congregation lookups)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS idx_members_trgm_search
  ON members USING gin (
    (first_name || ' ' || last_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '') || ' ' || COALESCE(member_number, '')) gin_trgm_ops
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm extension or GIN index skipped: %', SQLERRM;
END $$;


-- =========================================================================
-- Migration: 028_features_and_optimizations.sql
-- =========================================================================
-- ============================================================
-- 028_features_and_optimizations.sql
-- Child Check-In & Security Claim Tags, Campaign Pledges,
-- Volunteer Blockouts & Swaps, Live Cue State, and Composite Indexes.
-- ============================================================

-- 1. CHILD SAFETY CHECK-IN & SECURITY CODES (KidCheck / Safeguarding)
CREATE TABLE IF NOT EXISTS child_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  child_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  child_name VARCHAR(150) NOT NULL,
  classroom VARCHAR(100) DEFAULT 'General',
  security_code VARCHAR(12) NOT NULL,
  parent_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  parent_name VARCHAR(150) NOT NULL,
  parent_phone VARCHAR(30) NOT NULL,
  allergies_medical TEXT,
  notes TEXT,
  status VARCHAR(30) DEFAULT 'checked_in', -- checked_in | checked_out
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_out_at TIMESTAMPTZ,
  checked_out_by UUID REFERENCES users(id) ON DELETE SET NULL,
  pickup_person_name VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_check_ins_event ON child_check_ins(church_id, event_id, status);
CREATE INDEX IF NOT EXISTS idx_child_check_ins_code ON child_check_ins(church_id, security_code);

-- 2. CAPITAL CAMPAIGN PLEDGES ("Pledged vs. Redeemed")
CREATE TABLE IF NOT EXISTS campaign_pledges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES giving_campaigns(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  donor_name VARCHAR(150) NOT NULL,
  donor_email VARCHAR(255),
  donor_phone VARCHAR(30),
  pledge_amount NUMERIC(15,2) NOT NULL,
  amount_fulfilled NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'NGN',
  frequency VARCHAR(30) DEFAULT 'one_time', -- one_time | weekly | monthly | quarterly | annual
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status VARCHAR(30) DEFAULT 'active', -- active | fulfilled | cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_pledges_church ON campaign_pledges(church_id, campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_pledges_member ON campaign_pledges(church_id, member_id);

-- 3. VOLUNTEER BLOCKOUT DATES & ROSTER SWAP REQUESTS
CREATE TABLE IF NOT EXISTS volunteer_blockouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_blockouts_member ON volunteer_blockouts(church_id, member_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS volunteer_swap_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  roster_id UUID NOT NULL REFERENCES service_volunteers(id) ON DELETE CASCADE,
  requester_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  target_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'pending', -- pending | accepted | rejected | cancelled
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_swaps_plan ON volunteer_swap_requests(church_id, service_plan_id, status);

-- 4. LIVE SERVICE CUE RUNNER STATE
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS live_state JSONB DEFAULT '{"activeItemIndex": -1, "status": "idle", "startedAt": null}';

-- 5. COMPOSITE PERFORMANCE INDEXES FOR REPORTING & DASHBOARD
CREATE INDEX IF NOT EXISTS idx_transactions_church_type_date 
ON transactions(church_id, transaction_type, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_members_church_status_branch 
ON members(church_id, membership_status, branch_id);

CREATE INDEX IF NOT EXISTS idx_first_timers_church_pipeline 
ON first_timers(church_id, follow_up_status, visit_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_church_event 
ON attendance(church_id, event_id);



-- =========================================================================
-- Migration: 029_fellowship_virtual_and_pastoral_summons.sql
-- =========================================================================
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


-- =========================================================================
-- Migration: 030_department_service_checklists.sql
-- =========================================================================
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


-- =========================================================================
-- Migration: 031_first_timers_decision_photos_and_friendship.sql
-- =========================================================================
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


-- =========================================================================
-- Migration: 032_executive_reports_and_kpis.sql
-- =========================================================================
-- ============================================================
-- 032_executive_reports_and_kpis.sql
-- Executive Infographic Reports, First Timers' Hangout,
-- Assimilation KPIs, Spiritual Decision & Service Feedback
-- ============================================================

-- 1. FIRST TIMERS REPORTING COLUMNS
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS service_aspect_enjoyed VARCHAR(100) DEFAULT 'The Message';
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS born_again_status VARCHAR(30) DEFAULT 'Yes';
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS attended_hangout BOOLEAN DEFAULT false;
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS done_kic BOOLEAN DEFAULT false;
ALTER TABLE first_timers ADD COLUMN IF NOT EXISTS tribe_name VARCHAR(100);

-- Indexes for lightning-fast executive report generation
CREATE INDEX IF NOT EXISTS idx_first_timers_hangout ON first_timers(church_id, attended_hangout);
CREATE INDEX IF NOT EXISTS idx_first_timers_born_again ON first_timers(church_id, born_again_status);
CREATE INDEX IF NOT EXISTS idx_first_timers_aspect ON first_timers(church_id, service_aspect_enjoyed);
CREATE INDEX IF NOT EXISTS idx_first_timers_kic ON first_timers(church_id, done_kic);
CREATE INDEX IF NOT EXISTS idx_first_timers_tribe ON first_timers(church_id, tribe_name);


-- =========================================================================
-- Migration: 033_custom_domains_and_self_hosting.sql
-- =========================================================================
-- Migration 033: Custom Domain Mapping & Self-Hosting Support
ALTER TABLE churches ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_churches_custom_domain ON churches (LOWER(custom_domain));


-- =========================================================================
-- Migration: 034_role_jurisdiction_and_course_documents.sql
-- =========================================================================
-- 1. User & Department Jurisdiction Scoping
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_member ON users(member_id);
CREATE INDEX IF NOT EXISTS idx_departments_head_user ON departments(head_user_id);

-- 2. Discipleship Courses & Chapter Documents
ALTER TABLE discipleship_courses ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE discipleship_courses ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);

ALTER TABLE discipleship_lessons ADD COLUMN IF NOT EXISTS chapter_num INT;
ALTER TABLE discipleship_lessons ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE discipleship_lessons ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_disc_lessons_chapter ON discipleship_lessons(course_id, chapter_num);

-- 3. Daily Devotionals Manuals / Study Booklets
ALTER TABLE daily_devotionals ADD COLUMN IF NOT EXISTS manual_url TEXT;
ALTER TABLE daily_devotionals ADD COLUMN IF NOT EXISTS manual_name VARCHAR(255);

