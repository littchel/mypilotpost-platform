-- Migration to create template_performance tracking table
CREATE TABLE IF NOT EXISTS template_performance (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0.0,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, template_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_template_performance_brand 
  ON template_performance(brand_id);

CREATE INDEX IF NOT EXISTS idx_template_performance_template 
  ON template_performance(template_id);
