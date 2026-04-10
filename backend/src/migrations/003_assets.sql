-- ============================================================
-- 003: Church Assets / Inventory Management
-- ============================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
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
