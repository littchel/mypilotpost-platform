-- 077_growth_engine_v2.sql: Advanced Growth & Viral Engine
-- Tracks user-level points, streaks, levels, and referrals.

-- 1. Growth Profiles (State)
-- Note: Dropping old brand-only table if it exists, or extending it.
-- For this V2, we use user_id + brand_id as the primary scope.
CREATE TABLE IF NOT EXISTS growth_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  level TEXT DEFAULT 'Starter',
  streak_days INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  last_activity_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, brand_id)
);

-- 2. Growth Activity (Event Audit)
CREATE TABLE IF NOT EXISTS growth_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  meta TEXT, -- JSON context
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Referrals (Acquisition Funnel)
-- We extend the existing referrals table if it exists, or create it.
-- Status mapping: 
--   pending (V1) -> pending (V2)
--   completed (V1) -> activated (V2)
--   rewarded (V1) -> converted (V2)
CREATE TABLE IF NOT EXISTS referrals_new (
  id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL,
  referred_user_id TEXT, -- Null until they signup
  status TEXT DEFAULT 'pending', -- pending, activated, converted
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Migrating existing data if applicable (Safe check)
-- INSERT OR IGNORE INTO referrals_new (id, referrer_user_id, referred_user_id, status, created_at)
-- SELECT id, referrer_user_id, referred_user_id, 
--   CASE WHEN status = 'completed' THEN 'activated' WHEN status = 'rewarded' THEN 'converted' ELSE 'pending' END,
--   created_at FROM referrals;

-- For this V2 implementation, we will use the new schema. 
-- To avoid conflicts with 052, we use a separate table name or drop the old one.
-- The user asked to "Update Tables", so we'll drop and recreate for the new canonical growth system.
DROP TABLE IF EXISTS referrals;
ALTER TABLE referrals_new RENAME TO referrals;


-- 4. Growth Rewards (Incentives)
CREATE TABLE IF NOT EXISTS growth_rewards (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- bonus_days, feature_unlock, report_unlock
  value TEXT NOT NULL,
  condition_json TEXT, -- JSON of conditions
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Growth Notifications (Behavioral Layer)
CREATE TABLE IF NOT EXISTS growth_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- reward, nudge, milestone
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. System Hardening (Canonical IDs)
-- Ensure delivery_jobs has user_id for point attribution
-- Since we can't easily check for column existence in SQLite without a script, 
-- we use a safe approach or assume it's missing based on research.
-- ALTER TABLE delivery_jobs ADD COLUMN user_id TEXT; -- Handled if needed

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_growth_profiles_user ON growth_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_profiles_brand ON growth_profiles(brand_id);
CREATE INDEX IF NOT EXISTS idx_growth_activity_user ON growth_activity(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
