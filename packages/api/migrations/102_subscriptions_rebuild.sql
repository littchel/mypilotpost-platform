-- Migration: 102_subscriptions_rebuild.sql
-- Ensures subscriptions table has all columns required by subscription-engine.js.
--
-- PROBLEM: phase4_admin_compat.sql (runs last alphabetically) dropped and
-- recreated subscriptions with only 4 columns:
--   customer_id, status, plan, created_at
--
-- REQUIRED columns by billing engine:
--   plan_id, user_id, current_period_start, current_period_end, updated_at
--
-- APPROACH: create subscriptions_new with full schema, copy existing data,
-- drop old, rename. This is the safe SQLite schema migration pattern.

CREATE TABLE IF NOT EXISTS subscriptions_rebuild (
  customer_id           TEXT PRIMARY KEY,
  status                TEXT NOT NULL DEFAULT 'trial',
  plan                  TEXT NOT NULL DEFAULT 'starter',
  plan_id               TEXT,
  user_id               TEXT,
  current_period_start  TEXT,
  current_period_end    TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO subscriptions_rebuild (user_id, plan_id, status, created_at)
  SELECT user_id, plan_id, status, created_at
  FROM subscriptions;

DROP TABLE subscriptions;
ALTER TABLE subscriptions_rebuild RENAME TO subscriptions;

CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
