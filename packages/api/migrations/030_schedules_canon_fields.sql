-- packages/api/migrations/030_schedules_canon_fields.sql

-- Add missing columns to schedules to align with Canon 5 (delivery_jobs)
-- Note: SQLite ALTER TABLE is somewhat limited, but adding columns is safe.

ALTER TABLE delivery_jobs ADD COLUMN metadata TEXT;
ALTER TABLE delivery_jobs ADD COLUMN published_at TEXT;
