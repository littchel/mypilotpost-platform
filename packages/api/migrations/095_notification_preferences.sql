-- Migration: 095_notification_preferences.sql
-- Adds per-user notification preference control and delivery audit trail.
--
-- notification_preferences: one row per (user_id, brand_id, notification_type).
--   in_app  — show in notification center (default ON)
--   email   — queue to email_outbox (default ON for priority types)
--
-- notification_delivery_logs: immutable audit trail of every notification
--   queued for email delivery via this engine.

CREATE TABLE IF NOT EXISTS notification_preferences (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL,
  brand_id     TEXT NOT NULL,
  notif_type   TEXT NOT NULL,
  in_app       INTEGER NOT NULL DEFAULT 1,
  email        INTEGER NOT NULL DEFAULT 1,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, brand_id, notif_type)
);

CREATE INDEX IF NOT EXISTS idx_np_user_brand ON notification_preferences(user_id, brand_id);

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  notification_id TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  channel         TEXT NOT NULL,  -- 'in_app' | 'email'
  status          TEXT NOT NULL DEFAULT 'queued',  -- 'queued' | 'sent' | 'failed'
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ndl_notification ON notification_delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_ndl_user         ON notification_delivery_logs(user_id);
