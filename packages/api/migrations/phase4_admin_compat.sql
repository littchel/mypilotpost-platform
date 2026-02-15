-- =========================================
-- Phase 4 — Admin Compatibility Tables
-- SAFE • READ-ONLY • OBSERVABILITY
-- =========================================

-- Monthly MRR snapshots (admin read)
CREATE TABLE IF NOT EXISTS mrr_snapshots (
  customer_id TEXT NOT NULL,
  snapshot_month TEXT NOT NULL,
  mrr INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_customer
  ON mrr_snapshots(customer_id, snapshot_month);

------------------------------------------------

-- Delivery jobs (compat with admin analytics)
CREATE TABLE IF NOT EXISTS content_delivery_jobs (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  platform TEXT,
  state TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

------------------------------------------------

-- Delivery attempts
CREATE TABLE IF NOT EXISTS content_delivery_attempts (
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

-- Subscriptions (minimal admin view)
CREATE TABLE IF NOT EXISTS subscriptions (
  customer_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
