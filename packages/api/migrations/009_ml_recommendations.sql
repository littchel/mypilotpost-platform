-- 007_ml_recommendations.sql
-- Machine Learning recommendations (ranked suggestions)

CREATE TABLE IF NOT EXISTS ml_recommendations (
  id TEXT PRIMARY KEY,

  brand_id TEXT NOT NULL,

  recommendation_type TEXT NOT NULL,
  -- 'timing', 'platform', 'format', 'seo', 'campaign'

  target_type TEXT NOT NULL,
  -- 'content', 'campaign', 'brand'

  target_id TEXT,
  -- nullable for brand-level advice

  recommended_action TEXT NOT NULL,
  -- machine-readable action key

  score REAL NOT NULL,
  -- relative ranking score (higher = better)

  confidence REAL NOT NULL,
  -- 0–1

  explanation TEXT NOT NULL,
  -- JSON string: why this recommendation exists

  model_version TEXT NOT NULL,
  trained_at TEXT NOT NULL,

  created_at TEXT NOT NULL
);
