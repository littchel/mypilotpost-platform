-- Migration: 090_growth_engine_v2.sql
-- Reconciles schema divergence from 077_growth_engine_v2.sql and folds in 079_seed_growth_rewards.sql.
--
-- 077 PROBLEM:
--   075_growth.sql created growth_profiles with brand_id as PK, no user_id/id/referral_code.
--   077's CREATE TABLE IF NOT EXISTS growth_profiles was a no-op (table existed from 075).
--   077's CREATE INDEX idx_growth_profiles_user ON growth_profiles(user_id) then FAILED — no such column.
--   077 is backfilled in the tracker; this migration delivers its missing column effects.
--
-- 075 also created growth_activity without user_id; column is named 'metadata' not 'meta'.
--   engine.js inserts into growth_activity(user_id, ..., meta) — both columns were absent.
--
-- 077 created growth_rewards and growth_notifications (IF NOT EXISTS) — those tables do not
--   exist because the migration was rolled back on the index failure. Created here instead.
--
-- 079 PROBLEM (folded here):
--   079_seed_growth_rewards.sql INSERTs into growth_rewards, which doesn't exist until this
--   migration runs. 079 is backfilled in the tracker; seed data is included below as
--   INSERT OR IGNORE for idempotency.
--
-- APPLICATION IMPACT:
--   engine.js handleGrowthEvent:
--     INSERT INTO growth_activity(id, user_id, brand_id, action_type, points_awarded, meta) — unblocked
--     INSERT INTO growth_profiles(id, user_id, brand_id, ...) ON CONFLICT(user_id, brand_id) — unblocked
--     INSERT INTO growth_notifications(id, user_id, brand_id, message, type) — unblocked
--   engine.js applyReward: SELECT * FROM growth_rewards — unblocked
--   engine.js updateStreak/updateLevel/evaluateNudges: SELECT/UPDATE WHERE user_id = ? — unblocked
--   handlers.js: SELECT user_id, brand_id FROM growth_profiles WHERE referral_code = ? — unblocked
--
-- NOTE on growth_profiles.id:
--   brand_id remains the PRIMARY KEY (cannot change PK via ALTER TABLE in SQLite).
--   id is added as a nullable TEXT column. engine.js generates a UUID per-insert; existing
--   rows have NULL id, which is acceptable.
--
-- NOTE on growth_activity.meta vs .metadata:
--   075 created the column as 'metadata'; engine.js inserts as 'meta'. Both columns now
--   coexist — 'metadata' is unreferenced dead storage; 'meta' is the live column.
--
-- ROLLBACK:
--   SQLite / D1 does not support ALTER TABLE DROP COLUMN.
--   To roll back: rebuild affected tables excluding these columns (see 045 pattern).

-- growth_profiles: add columns required by engine.js
ALTER TABLE growth_profiles ADD COLUMN id           TEXT;
ALTER TABLE growth_profiles ADD COLUMN user_id      TEXT;
ALTER TABLE growth_profiles ADD COLUMN referral_code TEXT;

-- UNIQUE constraint on (user_id, brand_id) required for ON CONFLICT(user_id, brand_id) upsert
-- NULL user_id values are distinct per SQLite unique index semantics and do not conflict
CREATE UNIQUE INDEX IF NOT EXISTS idx_growth_profiles_user_brand
  ON growth_profiles(user_id, brand_id);

-- growth_activity: add columns required by engine.js
ALTER TABLE growth_activity ADD COLUMN user_id TEXT;
ALTER TABLE growth_activity ADD COLUMN meta    TEXT;

-- growth_rewards: create table (077 intended this; rolled back on index failure)
CREATE TABLE IF NOT EXISTS growth_rewards (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  value          TEXT NOT NULL,
  condition_json TEXT,
  is_active      INTEGER DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- growth_notifications: create table (077 intended this; rolled back on index failure)
CREATE TABLE IF NOT EXISTS growth_notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  brand_id   TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL,
  is_read    INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed rewards (from 079 — backfilled; INSERT OR IGNORE is idempotent)
INSERT OR IGNORE INTO growth_rewards (id, type, value, condition_json)
VALUES ('rew_7days', 'bonus_days', '7', '{"points_required": 200, "level": "Growth"}');

INSERT OR IGNORE INTO growth_rewards (id, type, value, condition_json)
VALUES ('rew_30days', 'bonus_days', '30', '{"points_required": 1000, "level": "Pro"}');

INSERT OR IGNORE INTO growth_rewards (id, type, value, condition_json)
VALUES ('feat_analytics', 'report_unlock', 'advanced_analytics', '{"points_required": 500}');

INSERT OR IGNORE INTO growth_rewards (id, type, value, condition_json)
VALUES ('feat_platforms', 'feature_unlock', 'extra_platforms', '{"points_required": 800}');

-- Indexes from 077
CREATE INDEX IF NOT EXISTS idx_growth_profiles_user     ON growth_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_profiles_brand    ON growth_profiles(brand_id);
CREATE INDEX IF NOT EXISTS idx_growth_activity_user     ON growth_activity(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer        ON referrals(referrer_user_id);
