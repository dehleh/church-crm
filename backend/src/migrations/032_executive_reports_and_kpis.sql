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
