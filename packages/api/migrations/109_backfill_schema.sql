-- Historical Analytics Backfill Schema
-- Adds backfilled flag to performance_snapshots + run tracking table

ALTER TABLE performance_snapshots ADD COLUMN backfilled INTEGER NOT NULL DEFAULT 0;

-- Idempotency: one backfill snapshot per (brand, post) — live 'api' records are unaffected
CREATE UNIQUE INDEX IF NOT EXISTS idx_perf_snap_backfill_dedup
  ON performance_snapshots(brand_id, external_post_id)
  WHERE source = 'backfill';

-- Tracks each backfill run for admin visibility
CREATE TABLE IF NOT EXISTS backfill_runs (
  id              TEXT PRIMARY KEY,
  brand_id        TEXT,     -- NULL = global run across all brands
  platform        TEXT,     -- NULL = all platforms
  status          TEXT NOT NULL DEFAULT 'running',  -- running | completed | failed
  started_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME,
  rows_imported   INTEGER NOT NULL DEFAULT 0,
  rows_skipped    INTEGER NOT NULL DEFAULT 0,
  rows_failed     INTEGER NOT NULL DEFAULT 0,
  date_from       TEXT,     -- ISO date (YYYY-MM-DD)
  date_to         TEXT,     -- ISO date (YYYY-MM-DD)
  error_log       TEXT      -- JSON array of { platform, brand_id, message }
);

CREATE INDEX IF NOT EXISTS idx_backfill_runs_brand ON backfill_runs(brand_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_runs_status ON backfill_runs(status, started_at DESC);
