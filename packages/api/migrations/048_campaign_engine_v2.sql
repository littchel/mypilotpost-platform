-- =========================================================
-- Campaign Engine (v2) — Strategic Execution Layer
-- Migration: 048_campaign_engine_v2.sql
-- =========================================================

-- 1. Enhance Campaigns Table
-- Add objective fields for better standardized analysis
ALTER TABLE campaigns ADD COLUMN objective_type TEXT DEFAULT 'awareness';
ALTER TABLE campaigns ADD COLUMN objective_text TEXT;

-- 2. Direct Linking (Primary Strategy)
-- campaign_id already added by 038_surgical_content_fix.sql; just add the named indexes
CREATE INDEX IF NOT EXISTS idx_social_assets_campaign ON social_assets (campaign_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_campaign ON blog_posts (campaign_id);

-- 3. Flexible Linking (Join Table - Re-establishment)
-- Ensures multi-campaign compatibility in the future
CREATE TABLE IF NOT EXISTS campaign_content_links (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  content_type TEXT NOT NULL, -- social | blog
  content_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaign_content_links_composite 
  ON campaign_content_links (campaign_id, content_id);

-- 4. Performance Caching Table
-- Prevents expensive aggregation on every dashboard load
CREATE TABLE IF NOT EXISTS campaign_metrics_cache (
  campaign_id TEXT PRIMARY KEY,
  metrics_json TEXT NOT NULL, -- JSON blob of aggregated metrics
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- 5. Data Migration Logic
-- Move existing join-table links to the primary column (for social)
UPDATE social_assets
SET campaign_id = (
  SELECT campaign_id 
  FROM campaign_content_links 
  WHERE content_id = social_assets.id AND content_type = 'social'
  LIMIT 1
)
WHERE campaign_id IS NULL;

-- Move existing join-table links to the primary column (for blog)
UPDATE blog_posts
SET campaign_id = (
  SELECT campaign_id 
  FROM campaign_content_links 
  WHERE content_id = blog_posts.id AND content_type = 'blog'
  LIMIT 1
)
WHERE campaign_id IS NULL;

-- 6. Migration Record
INSERT INTO d1_migrations (name, applied_at)
VALUES ('048_campaign_engine_v2', CURRENT_TIMESTAMP);
