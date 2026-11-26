-- ============================================================
-- Migration 037: Department Budgets, Approval Workflow & Itemized Breakdown
-- ============================================================

-- 1. Extend budgets table for department budgets and approval workflow
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  ADD COLUMN IF NOT EXISTS period_detail VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS items_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_budgets_department ON budgets(church_id, department_id, status);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(church_id, status);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON budgets(church_id, fiscal_year);

-- 2. Line Items Table for Itemized Departmental Breakdown
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'operational', -- equipment | operational | events | training | welfare | honorarium | printing | transport | repairs | utilities | other
  description TEXT,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  spent_amount NUMERIC(15, 2) DEFAULT 0.00,
  priority VARCHAR(20) DEFAULT 'medium',        -- high | medium | low
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_church ON budget_items(church_id);
