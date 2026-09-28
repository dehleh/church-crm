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
