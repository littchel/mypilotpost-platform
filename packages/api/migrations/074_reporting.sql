-- 074_reporting.sql: Advanced Reporting Engine
-- Frozen data snapshots and modular sections

-- 1. Clean up legacy reporting structure
DROP TABLE IF EXISTS report_sections;
DROP TABLE IF EXISTS reports;

-- 2. Standardized Reports table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('social_performance', 'seo_audit', 'brand_growth', 'executive_summary')),
  layout_type TEXT NOT NULL DEFAULT 'standard' CHECK (layout_type IN ('standard', 'compact', 'detailed', 'presentation')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published', 'archived')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Report Sections table (Narrative vs Config)
CREATE TABLE IF NOT EXISTS report_sections (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN ('narrative', 'data_grid', 'chart', 'intelligence_insight')),
  title TEXT,
  content TEXT NOT NULL, -- JSON content or Markdown text
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- 4. Report Snapshots (The "Frozen" truth)
CREATE TABLE IF NOT EXISTS report_snapshots (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  snapshot_key TEXT NOT NULL, -- e.g. 'engagement_rate'
  snapshot_value REAL NOT NULL,
  snapshot_meta TEXT, -- JSON blob for context
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_reports_brand_type ON reports(brand_id, report_type);
CREATE INDEX IF NOT EXISTS idx_report_sections_lookup ON report_sections(report_id, order_index);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_lookup ON report_snapshots(report_id, snapshot_key);
