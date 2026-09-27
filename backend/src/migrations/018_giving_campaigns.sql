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
