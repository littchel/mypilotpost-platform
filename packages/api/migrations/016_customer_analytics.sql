-- =========================================
-- Milestone 6: Customer Analytics
-- Migration: 011_customer_analytics.sql
-- Status: FINAL
-- =========================================

-- Per-content aggregated analytics
CREATE TABLE IF NOT EXISTS content_analytics (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_type TEXT NOT NULL,        -- social | blog
  content_id TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(content_type, content_id),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_analytics_brand
ON content_analytics(brand_id);

-- Daily rollups (optional but powerful)
CREATE TABLE IF NOT EXISTS daily_analytics (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  date TEXT NOT NULL,                -- YYYY-MM-DD (UTC)
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(brand_id, date),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);
