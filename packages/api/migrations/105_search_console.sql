-- 105_search_console.sql
-- Google Search Console integration tables + seo_metrics date uniqueness

-- Add unique constraint to seo_metrics(brand_id, date) so Search Console sync can upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_metrics_brand_date ON seo_metrics(brand_id, date);

CREATE TABLE IF NOT EXISTS search_console_properties (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  property_url TEXT NOT NULL,
  permission_level TEXT DEFAULT 'siteOwner',
  is_default INTEGER DEFAULT 0,
  synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, property_url)
);

CREATE TABLE IF NOT EXISTS search_console_queries (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  property_url TEXT NOT NULL,
  query TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  position REAL DEFAULT 0,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_console_pages (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  property_url TEXT NOT NULL,
  page TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  position REAL DEFAULT 0,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sc_properties_brand ON search_console_properties(brand_id);
CREATE INDEX IF NOT EXISTS idx_sc_queries_brand ON search_console_queries(brand_id);
CREATE INDEX IF NOT EXISTS idx_sc_queries_synced ON search_console_queries(synced_at);
CREATE INDEX IF NOT EXISTS idx_sc_pages_brand ON search_console_pages(brand_id);
