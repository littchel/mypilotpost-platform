-- packages/api/migrations/055_growth_engine_hardening.sql

-- Streak tracking for brand engagement
ALTER TABLE brands ADD COLUMN streak_count INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN last_posted_at TEXT;

-- Strategic Score tracking and deltas
ALTER TABLE brands ADD COLUMN current_score INTEGER;
ALTER TABLE brands ADD COLUMN previous_score INTEGER;
ALTER TABLE brands ADD COLUMN score_delta INTEGER;
ALTER TABLE brands ADD COLUMN delta_drivers TEXT; -- JSON array of strings

-- Weekly reporting state
ALTER TABLE brands ADD COLUMN weekly_report_ready INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN last_weekly_report_at TEXT;

-- Index for streak performance
CREATE INDEX IF NOT EXISTS idx_brands_streak ON brands(id, streak_count);
