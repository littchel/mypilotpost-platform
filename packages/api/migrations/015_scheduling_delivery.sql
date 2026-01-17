-- =========================================
-- Milestone 5: Scheduling & Delivery
-- Migration: 010_scheduling_delivery.sql
-- Status: FINAL
-- =========================================

-- Scheduled jobs
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_type TEXT NOT NULL,        -- social | blog
  content_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | processing | delivered | failed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedules_due
ON schedules(status, scheduled_at);

-- Delivery attempts (append-only)
CREATE TABLE IF NOT EXISTS delivery_attempts (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  status TEXT NOT NULL,              -- success | failed
  response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_delivery_schedule
ON delivery_attempts(schedule_id);
