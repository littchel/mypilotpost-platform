-- 050_seo_engine.sql
-- FULL SYSTEM BUILD: LIGHT + STRATEGIC SEO

CREATE TABLE IF NOT EXISTS seo_pages (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'social' | 'blog'
  keyword_primary TEXT,
  keyword_secondary TEXT, -- JSON array
  title TEXT,
  meta_description TEXT,
  seo_score INTEGER DEFAULT 0,
  readability_score INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_metrics (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_id TEXT, -- Optional: maps to specific content if known
  content_type TEXT, -- 'social' | 'blog'
  date TEXT NOT NULL, -- ISO-8601 YYYY-MM-DD
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr FLOAT DEFAULT 0.0,
  avg_position FLOAT DEFAULT 0.0,
  source TEXT DEFAULT 'search_console', -- 'search_console' | 'future_api'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seo_pages_brand ON seo_pages(brand_id);
CREATE INDEX IF NOT EXISTS idx_seo_pages_content ON seo_pages(content_id);
CREATE INDEX IF NOT EXISTS idx_seo_metrics_brand ON seo_metrics(brand_id);
CREATE INDEX IF NOT EXISTS idx_seo_metrics_date ON seo_metrics(date);
