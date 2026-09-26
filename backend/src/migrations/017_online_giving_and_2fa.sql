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
