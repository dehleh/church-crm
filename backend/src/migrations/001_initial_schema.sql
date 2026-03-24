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
  role VARCHAR(30) NOT NULL DEFAULT 'staff',   -- super_admin | admin | pastor | staff | viewer
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
