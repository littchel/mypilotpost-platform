-- Migration: 097_auth_hardening.sql
-- Phase B hardening: email outbox retry support.
--
-- email_outbox additions:
--   retry_count — incremented on each failed send attempt (default 0)
--   last_error  — last failure message for dead-letter diagnosis
--   Enables email-worker.js dead-letter pattern (max 3 retries).
--
-- NOTE: admin_audit_logs table already exists from a prior migration
-- (created before this numbering series). CREATE TABLE IF NOT EXISTS is safe
-- but would silently skip on conflict. The table is not redefined here.
-- The ip_address and user_agent columns are additive improvements.

ALTER TABLE email_outbox ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_outbox ADD COLUMN last_error  TEXT;

CREATE INDEX IF NOT EXISTS idx_outbox_retry
  ON email_outbox(status, retry_count)
  WHERE status IN ('pending', 'failed');

-- Extend admin_audit_logs with IP + UA for login observability
ALTER TABLE admin_audit_logs ADD COLUMN ip_address TEXT;
ALTER TABLE admin_audit_logs ADD COLUMN user_agent  TEXT;
