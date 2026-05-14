-- Migration: 096_lifecycle_email_engine.sql
-- Extends lifecycle email system with unsubscribe management,
-- engagement tracking, and lifecycle-to-outbox linkage.
--
-- email_unsubscribes: per-user unsubscribe record, token-based.
--   categories = 'all' blocks all email; JSON array blocks specific types.
--
-- email_outbox additions:
--   lifecycle_event_id — fixes dispatcher dedup (was incorrectly using payload column)
--   opened_at / clicked_at — pixel/link engagement tracking stubs
--   unsubscribe_token — per-email unsubscribe link token

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  categories      TEXT NOT NULL DEFAULT 'all',
  unsubscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_unsub_token ON email_unsubscribes(token);

ALTER TABLE email_outbox ADD COLUMN lifecycle_event_id TEXT;
ALTER TABLE email_outbox ADD COLUMN opened_at          TEXT;
ALTER TABLE email_outbox ADD COLUMN clicked_at         TEXT;
ALTER TABLE email_outbox ADD COLUMN unsubscribe_token  TEXT;

CREATE INDEX IF NOT EXISTS idx_outbox_lifecycle ON email_outbox(lifecycle_event_id);
