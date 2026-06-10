-- Migration: 134_operations_repair.sql
-- ENGINE 23 — Platform Operations & Governance Repair

-- 1. Platform controls kill-switch table
--    enabled = 0 → control OFF (normal operation)
--    enabled = 1 → control ON (paused / maintenance active)
CREATE TABLE IF NOT EXISTS platform_controls (
  key        TEXT PRIMARY KEY,
  enabled    INTEGER NOT NULL DEFAULT 0,
  reason     TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed all runtime controls (all disabled by default = platform operating normally)
INSERT OR IGNORE INTO platform_controls (key, enabled, reason) VALUES
  ('maintenance_mode',           0, NULL),
  ('pause_generation',           0, NULL),
  ('pause_delivery',             0, NULL),
  ('pause_email',                0, NULL),
  ('pause_registration',         0, NULL),
  ('pause_platform_instagram',   0, NULL),
  ('pause_platform_linkedin',    0, NULL),
  ('pause_platform_facebook',    0, NULL),
  ('pause_platform_x',           0, NULL),
  ('pause_platform_tiktok',      0, NULL),
  ('pause_platform_pinterest',   0, NULL),
  ('pause_platform_threads',     0, NULL),
  ('pause_platform_youtube',     0, NULL),
  ('pause_platform_wordpress',   0, NULL),
  ('pause_platform_google_business', 0, NULL);

-- 2. Index for fast key lookups (control read path is hot)
CREATE INDEX IF NOT EXISTS idx_platform_controls_key ON platform_controls(key);
