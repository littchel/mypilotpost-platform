-- Migration: 098_support_system_v2.sql
-- Extends existing support tables with read tracking and message metadata.
--
-- support_messages additions:
--   read_at        — timestamp when the receiver opened the message (NULL = unread)
--   is_admin_msg   — 1 if sent by an admin role user (for frontend display differentiation)
--
-- support_threads additions (if column not already present):
--   assigned_admin_id — admin user_id assigned to handle this thread
--   priority          — low / normal / high / urgent

ALTER TABLE support_messages ADD COLUMN read_at       TEXT;
-- is_admin_msg already added by 064_support_chat.sql fix

ALTER TABLE support_threads ADD COLUMN assigned_admin_id TEXT;
ALTER TABLE support_threads ADD COLUMN priority          TEXT NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_support_msgs_receiver
  ON support_messages(receiver_id, read_at);

CREATE INDEX IF NOT EXISTS idx_support_threads_status
  ON support_threads(status, created_at);
