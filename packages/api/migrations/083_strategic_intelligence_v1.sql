-- 083_strategic_intelligence_v1.sql: Strategic Intelligence Layer
-- Supports Business Intelligence, Competitor Tracking, Sentiment, and Executive Metrics

-- 1. Brand Business Intelligence (User-supplied business data)
CREATE TABLE IF NOT EXISTS brand_business_intelligence (
  brand_id TEXT PRIMARY KEY,
  monthly_ad_spend REAL,
  average_customer_value REAL,
  customer_lifetime_value REAL,
  monthly_revenue_range TEXT,
  target_cpa REAL,
  target_roas REAL,
  lead_goal INTEGER,
  conversion_rate REAL,
  close_rate REAL,
  sales_cycle_length TEXT,
  primary_conversion_event TEXT,
  crm_platform TEXT,
  attribution_model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 2. Competitor Tracking
CREATE TABLE IF NOT EXISTS competitor_tracking (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  url TEXT,
  platform_presence TEXT, -- JSON array
  estimated_authority REAL,
  posting_frequency REAL,
  engagement_estimate REAL,
  audience_growth_estimate REAL,
  visibility_score REAL,
  benchmark_scores TEXT, -- JSON object
  content_mix TEXT, -- JSON object
  share_of_voice_estimate REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 3. Brand Sentiment Snapshots
CREATE TABLE IF NOT EXISTS brand_sentiment_snapshots (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  positive_score REAL,
  neutral_score REAL,
  negative_score REAL,
  trust_score REAL,
  volatility_score REAL,
  confidence REAL,
  trend_direction TEXT,
  snapshot_date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 4. Executive Metrics (Calculated business metrics)
CREATE TABLE IF NOT EXISTS executive_metrics (
  brand_id TEXT PRIMARY KEY,
  estimated_cpa REAL,
  engagement_efficiency REAL,
  growth_velocity REAL,
  conversion_efficiency REAL,
  retention_health REAL,
  audience_quality REAL,
  content_velocity REAL,
  authority_score REAL,
  trust_score REAL,
  brand_momentum REAL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 5. Indices
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_brand ON competitor_tracking(brand_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_brand ON brand_sentiment_snapshots(brand_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_date ON brand_sentiment_snapshots(snapshot_date);
