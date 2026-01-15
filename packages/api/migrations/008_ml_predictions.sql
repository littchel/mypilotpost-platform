-- 006_ml_predictions.sql
-- Machine Learning predictions (advisory only)

CREATE TABLE IF NOT EXISTS ml_predictions (
  id TEXT PRIMARY KEY,

  brand_id TEXT NOT NULL,

  subject_type TEXT NOT NULL,
  -- e.g. 'content', 'campaign', 'seo_action'

  subject_id TEXT,
  -- nullable for pattern-level predictions

  prediction_type TEXT NOT NULL,
  -- e.g. 'engagement_score', 'conversion_probability'

  predicted_value REAL NOT NULL,
  -- normalized score or documented unit

  confidence REAL NOT NULL,
  -- 0–1 model confidence

  baseline_value REAL,
  -- historical baseline used for comparison

  reference_window_days INTEGER NOT NULL,
  -- lookback window used for training

  model_version TEXT NOT NULL,
  trained_at TEXT NOT NULL,

  explanation TEXT NOT NULL,
  -- JSON string: feature contributions & reasoning

  created_at TEXT NOT NULL
);
