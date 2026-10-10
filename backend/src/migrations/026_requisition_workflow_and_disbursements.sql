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
