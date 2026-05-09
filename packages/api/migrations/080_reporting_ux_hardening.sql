-- 080_reporting_ux_hardening.sql
-- Hardens reporting table for UX contract compliance.

ALTER TABLE reports ADD COLUMN report_type TEXT DEFAULT 'performance';
ALTER TABLE reports ADD COLUMN template_id INTEGER DEFAULT 1;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
