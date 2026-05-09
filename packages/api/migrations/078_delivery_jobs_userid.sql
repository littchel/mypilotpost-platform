-- 078_delivery_jobs_userid.sql
-- Hardens delivery_jobs with user_id for point attribution.

-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN.
-- We assume it's missing based on schema audit.
ALTER TABLE delivery_jobs ADD COLUMN user_id TEXT;

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_user ON delivery_jobs(user_id);
