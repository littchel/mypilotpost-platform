-- 075_growth.sql: Brand Growth & Loyalty System
-- Tracks points, levels, and streaks via event triggers

-- 1. Growth Profiles table (State)
CREATE TABLE IF NOT EXISTS growth_profiles (
  brand_id TEXT PRIMARY KEY,
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_activity_at TEXT,
  next_streak_at TEXT, -- Next window to increment streak
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 2. Growth Activity table (Event Audit)
CREATE TABLE IF NOT EXISTS growth_activity (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- e.g. 'content_published', 'approval_granted'
  points_awarded INTEGER NOT NULL,
  metadata TEXT, -- JSON context (e.g. { content_id: '...' })
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_growth_activity_brand ON growth_activity(brand_id, action_type);
CREATE INDEX IF NOT EXISTS idx_growth_points ON growth_profiles(points DESC);
