-- =========================================
-- Phase 4 — Admin Compatibility Tables
-- SAFE • READ-ONLY • OBSERVABILITY
-- =========================================

-- Monthly MRR snapshots: do NOT drop — revenue-engine.js owns this table.
-- 001_billing.sql created it with brand_id. Keep it as-is.
CREATE TABLE IF NOT EXISTS mrr_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_month TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  mrr INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (snapshot_month, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_month ON mrr_snapshots(snapshot_month);

------------------------------------------------

-- Delivery jobs (compat with admin analytics)
DROP TABLE IF EXISTS content_delivery_jobs;
CREATE TABLE content_delivery_jobs (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  platform TEXT,
  state TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

------------------------------------------------

-- Delivery attempts
DROP TABLE IF EXISTS content_delivery_attempts;
CREATE TABLE content_delivery_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT,
  attempt INTEGER,
  success INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

------------------------------------------------

-- Churn signals (admin observability)
CREATE TABLE IF NOT EXISTS churn_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  severity INTEGER NOT NULL,
  description TEXT,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

------------------------------------------------

-- Subscriptions: do NOT drop — billing engine owns this table.
-- 102_subscriptions_rebuild.sql ensures the full schema is present.
CREATE TABLE IF NOT EXISTS subscriptions (
  customer_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'trial',
  plan TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
