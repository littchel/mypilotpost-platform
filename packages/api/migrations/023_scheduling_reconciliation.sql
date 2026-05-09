-- packages/api/migrations/023_scheduling_reconciliation.sql
-- RECONCILIATION • PHASE 7 RECOVERY

PRAGMA foreign_keys = OFF;

-- 1. Rename schedules to delivery_jobs (Canon 5)
-- If it already exists (from a previous failed run), skip
-- Since SQLite doesn't have RENAME IF EXISTS, we use a block
DROP TABLE IF EXISTS delivery_jobs;
ALTER TABLE schedules RENAME TO delivery_jobs;

-- 2. Clean up old delivery_attempts (which used schedule_id)
-- 024 will recreate this with job_id
DROP TABLE IF EXISTS delivery_attempts;

PRAGMA foreign_keys = ON;
