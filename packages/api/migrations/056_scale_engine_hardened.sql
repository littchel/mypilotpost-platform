-- packages/api/migrations/056_scale_engine_hardened.sql

-- Outcome-driven Achievements tracking
-- Replaces basic activity milestones with value-based triggers
CREATE TABLE IF NOT EXISTS brand_achievements (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  achievement_key TEXT NOT NULL, -- e.g., 'VIRAL_HIT', 'GROWTH_25', 'CONSISTENCY_KING'
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  value_snapshot TEXT, -- JSON snapshot of the data that triggered it
  is_seen INTEGER DEFAULT 0,
  FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- Identity Archetypes & High-Growth Metrics
ALTER TABLE brands ADD COLUMN archetype TEXT; -- 'creator', 'builder', 'strategist'
ALTER TABLE brands ADD COLUMN highest_score INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN highest_streak INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN viral_count INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN total_engagement_gain REAL DEFAULT 0.0;

-- Indices for performance analysis
CREATE INDEX IF NOT EXISTS idx_brand_achievements_brand ON brand_achievements(brand_id);
CREATE INDEX IF NOT EXISTS idx_brands_archetype ON brands(archetype);
