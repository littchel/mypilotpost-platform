-- 076_intelligence.sql: Brand Intelligence Engine
-- Persistent actionable insights

-- 1. Brand Insights table
CREATE TABLE IF NOT EXISTS brand_insights (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('performance', 'seo', 'growth', 'competitor', 'advisory')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  action_link TEXT, -- Link to relevant dashboard tab
  resolved INTEGER DEFAULT 0,
  metadata TEXT, -- JSON evidence/data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 2. Index for dashboard lookup
-- idx_insights_brand_unresolved deferred to 089_brand_insights_v2.sql (resolved column added there)
CREATE INDEX IF NOT EXISTS idx_insights_priority ON brand_insights(priority);
