-- 008_ml_anomalies.sql
-- Machine Learning anomaly detection (signals only)

CREATE TABLE IF NOT EXISTS ml_anomalies (
  id TEXT PRIMARY KEY,

  brand_id TEXT NOT NULL,

  anomaly_type TEXT NOT NULL,
  -- 'engagement_drop', 'delivery_failure_spike', etc.

  subject_type TEXT NOT NULL,
  -- 'content', 'campaign', 'platform', 'brand'

  subject_id TEXT,

  severity REAL NOT NULL,
  -- normalized 0–1

  deviation REAL NOT NULL,
  -- distance from baseline

  baseline_description TEXT NOT NULL,
  -- textual description of expected behavior

  explanation TEXT NOT NULL,
  -- JSON string: features & drivers

  model_version TEXT NOT NULL,
  detected_at TEXT NOT NULL,

  created_at TEXT NOT NULL
);
