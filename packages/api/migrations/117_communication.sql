-- myPilotPost — Communication Preferences & Notification Events

CREATE TABLE IF NOT EXISTS communication_preferences (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  brand_id     TEXT,
  channel      TEXT NOT NULL,  -- email | whatsapp
  enabled      INTEGER NOT NULL DEFAULT 1,
  -- per-type overrides stored as JSON: { approval:1, report:1, invite:1, scheduler:1, digest:0 }
  type_config  TEXT NOT NULL DEFAULT '{}',
  whatsapp_number TEXT,         -- verified WhatsApp number for this user
  quiet_start  TEXT,            -- HH:MM e.g. "22:00"
  quiet_end    TEXT,            -- HH:MM e.g. "08:00"
  updated_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, brand_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_commprefs_user ON communication_preferences(user_id);

CREATE TABLE IF NOT EXISTS notification_events (
  id              TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL,
  user_id         TEXT,
  event           TEXT NOT NULL,  -- opened | clicked | completed | dismissed
  channel         TEXT,           -- in_app | email | whatsapp
  metadata        TEXT,           -- JSON
  created_at      DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_events_notif ON notification_events(notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_events_user  ON notification_events(user_id);

-- Delivery log (extend existing notification_delivery_logs with WhatsApp)
-- Add whatsapp_message_id to track Meta delivery status
ALTER TABLE notification_delivery_logs ADD COLUMN IF NOT EXISTS provider_ref TEXT;
ALTER TABLE notification_delivery_logs ADD COLUMN IF NOT EXISTS metadata TEXT;
