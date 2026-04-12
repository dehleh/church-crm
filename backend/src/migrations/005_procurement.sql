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
