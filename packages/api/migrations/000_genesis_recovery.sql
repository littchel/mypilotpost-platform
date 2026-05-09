-- packages/api/migrations/000_genesis_recovery.sql
-- RECOVERY ONLY • RESTORES MISSING BASELINE TABLES

PRAGMA foreign_keys = OFF;

-- Foundation: Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

-- Foundation: Brands
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  tone TEXT,
  goals TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

-- Foundation: Missions
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- Foundation: Customers (Pre-RECONCILIATION state)
-- Note: Some migrations expect brand_id on customers early, others late.
-- We create the minimal table here; 025/026 will fix it.
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  brand_id TEXT,
  plan TEXT DEFAULT 'free',
  mrr INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Foundation: Usage Metrics
CREATE TABLE IF NOT EXISTS usage_metrics (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  metric_type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

PRAGMA foreign_keys = ON;
