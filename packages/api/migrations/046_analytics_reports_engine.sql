-- packages/api/migrations/046_analytics_reports_engine.sql

-- 1. Create reports table for analytic snapshots
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  period TEXT NOT NULL,           -- e.g. "2024-05-01 - 2024-05-31"
  report_data TEXT NOT NULL,      -- JSON snapshot of analytics
  executive_summary TEXT,         -- Editable text
  recommendations TEXT,           -- Editable text
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Add global Agency Branding to users table
ALTER TABLE users ADD COLUMN agency_name TEXT;
ALTER TABLE users ADD COLUMN agency_logo_url TEXT;

-- 3. Add Brand Logo to brands table
ALTER TABLE brands ADD COLUMN logo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_reports_brand ON reports(brand_id);
