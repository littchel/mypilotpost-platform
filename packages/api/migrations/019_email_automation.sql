-- =========================================
-- Milestone 9: Email & Lifecycle Automation
-- Migration: 014_email_automation.sql
-- =========================================

-- Canonical lifecycle events
CREATE TABLE IF NOT EXISTS lifecycle_events (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  brand_id TEXT,
  type TEXT NOT NULL,           -- user_registered, brand_created, content_published, plan_limit_hit, churn_risk
  payload TEXT,                 -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Email outbox (append-only)
CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  template TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload TEXT,
  status TEXT NOT NULL,         -- pending | sent | failed
  provider TEXT,
  provider_ref TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT
);
