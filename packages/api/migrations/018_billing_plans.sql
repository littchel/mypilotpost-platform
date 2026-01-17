-- =========================================
-- Milestone 8: Billing, Plans & Enforcement
-- Migration: 013_billing_plans.sql
-- =========================================

-- Plans (static, admin-managed)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  billing_interval TEXT NOT NULL, -- monthly | yearly | lifetime
  limits TEXT NOT NULL,           -- JSON { generations, scheduled, brands }
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Customer plan assignment
CREATE TABLE IF NOT EXISTS customer_plans (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,           -- active | canceled | expired
  started_at TEXT NOT NULL,
  ends_at TEXT,
  is_lifetime INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Payments (append-only)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  provider TEXT NOT NULL,         -- yoco | manual
  provider_ref TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,           -- success | failed | refunded
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Usage metrics (already referenced earlier, formalized here)
CREATE TABLE IF NOT EXISTS usage_metrics (
  customer_id TEXT PRIMARY KEY,
  generations INTEGER DEFAULT 0,
  scheduled INTEGER DEFAULT 0,
  delivered INTEGER DEFAULT 0,
  brands INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
