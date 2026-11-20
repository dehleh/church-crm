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

