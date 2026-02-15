-- =====================================================================
-- myPilotPost — Phase 3: Delivery Engine (Execution Layer)
-- Migration: 006_delivery_engine_phase_3.sql
-- Database: admin_db
--
-- Purpose:
--   - Introduce auditable delivery execution attempts
--   - Enable retry logic and truthful delivery outcomes
--
-- Safety:
--   - Additive only
--   - No changes to existing tables
--   - No changes to delivery_jobs semantics
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- delivery_attempts
--
-- Tracks every execution attempt for a delivery job.
-- One row per attempt. Never updated, only inserted.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  job_id INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL,

  platform TEXT NOT NULL,

  status TEXT NOT NULL CHECK (
    status IN ('success', 'failed', 'retrying')
  ),

  error_code TEXT,
  error_message TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (job_id)
    REFERENCES delivery_jobs(id)
    ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

-- Fast lookup of attempts per job
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_job_id
  ON delivery_attempts(job_id);

-- Fast ordering of attempts per job
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_job_attempt
  ON delivery_attempts(job_id, attempt_number);

-- ---------------------------------------------------------------------
-- Migration record
-- ---------------------------------------------------------------------

INSERT INTO d1_migrations (name, applied_at)
VALUES (
  '006_delivery_engine_phase_3',
  CURRENT_TIMESTAMP
);
