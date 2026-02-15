-- =========================================
-- Migration: 001_billing.sql
-- Milestone 8 — Monetization, Billing & Churn
-- CANON-ALIGNED (brand_id)
-- =========================================

-- =====================================================
-- PAYMENTS (immutable provider facts)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,

  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_brand
  ON payments(brand_id);

-- =====================================================
-- BILLING EVENTS (meaningful lifecycle events)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_events_brand
  ON billing_events(brand_id);

-- =====================================================
-- SUBSCRIPTIONS (authoritative entitlement state)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status);

-- =====================================================
-- MRR SNAPSHOTS (immutable monthly revenue)
-- =====================================================
CREATE TABLE IF NOT EXISTS mrr_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_month TEXT NOT NULL, -- YYYY-MM
  brand_id TEXT NOT NULL,
  mrr INTEGER NOT NULL,
  created_at TEXT NOT NULL,

  UNIQUE (snapshot_month, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_month
  ON mrr_snapshots(snapshot_month);

-- =====================================================
-- CHURN SIGNALS (explainable risk)
-- =====================================================
CREATE TABLE IF NOT EXISTS churn_signals (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  severity INTEGER NOT NULL,
  description TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_churn_signals_brand
  ON churn_signals(brand_id);

CREATE INDEX IF NOT EXISTS idx_churn_signals_active
  ON churn_signals(brand_id, resolved_at);
