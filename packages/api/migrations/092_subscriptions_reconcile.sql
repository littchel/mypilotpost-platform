-- Migration: 092_subscriptions_reconcile.sql
-- Reconciles schema damage from phase4_admin_compat.sql.
--
-- PROBLEM:
--   phase4_admin_compat.sql dropped and recreated subscriptions with a minimal
--   admin-analytics schema: (customer_id PK, status, plan, created_at).
--   This stripped 7 columns required by billing and subscription-engine.js:
--     id, user_id, plan_id, started_at, current_period_start,
--     current_period_end, updated_at
--
-- APPROACH: additive ALTER TABLE ADD COLUMN — no table rebuild.
--   Existing rows receive NULL for all new columns; engine enforces values
--   on next event. subscription-engine.js SELECT * WHERE customer_id and
--   UPDATE WHERE id both tolerate NULL id on pre-existing rows.
--
-- CONSUMER IMPACT AFTER THIS MIGRATION:
--   subscription-engine.js INSERT path: unblocked
--   subscription-engine.js UPDATE path: unblocked (WHERE id = ? on rows inserted after this migration)
--   billing.js updateSubscription (SELECT/UPDATE WHERE user_id): unblocked
--   server.js:755 UPDATE SET plan_id WHERE user_id: unblocked
--   growth/engine.js applyReward (UPDATE WHERE brand_id): unblocked
--
-- NOTE: customer_id remains PRIMARY KEY (cannot change in SQLite via ALTER).
--   billing.js references user_id; subscription-engine.js references customer_id.
--   Both columns now coexist — they map to the same concept in different call sites.
--
-- ROLLBACK: SQLite / D1 does not support ALTER TABLE DROP COLUMN.

-- id, started_at, current_period_start, current_period_end, updated_at already in 001_billing.sql CREATE TABLE
ALTER TABLE subscriptions ADD COLUMN user_id              TEXT;
ALTER TABLE subscriptions ADD COLUMN plan_id              TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
