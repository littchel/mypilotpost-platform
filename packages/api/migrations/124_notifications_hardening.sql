-- 124_notifications_hardening.sql
-- Notifications & Communication Engine Certification — schema fixes and indices.
--
-- CODE FIXES (in this release, not SQL):
--   communication/preferences.js:82 — quiet hours inQuiet() used OR logic — same-day ranges
--     (e.g. 14:00–18:00) incorrectly matched times outside the window. Fixed to use AND
--     for same-day ranges and OR for overnight ranges (start > end).
--   communication/notify.js       — in-app notification no longer inserted when recipientId is
--     null (external reviewer without platform account). Orphan brand-scoped records no longer
--     pollute the brand's notification center.
--   notifications/notifications.js — handleNotificationEvent() now skips bus events that have
--     no defined title mapping, preventing junk "Notification / You have a new update" records
--     for audit_generated, insight_resolved, report_generated, content_submitted, invite_created.
--   support/requests.js           — admin email now reads env.SUPPORT_EMAIL with fallback to
--     hardcoded constant, making it configurable without a code deploy.
--
-- SCHEMA FIX 1: email_unsubscribes.categories default
--   096_lifecycle_email_engine.sql defined DEFAULT 'all' (globally unsubscribed).
--   engine.js getOrCreateUnsubscribeToken() always inserts '[]' (subscribed) explicitly,
--   so new rows are correct. However any row created by the raw DEFAULT (e.g. DB migrations
--   or admin scripts omitting the column) would be permanently unsubscribed.
--   SQLite cannot ALTER COLUMN DEFAULT in D1; patch existing rows that have the wrong default.

UPDATE email_unsubscribes
SET categories = '[]'
WHERE categories = 'all' AND unsubscribed_at IS NULL;

-- SCHEMA FIX 2: email_outbox performance indices
--   019_email_automation.sql created email_outbox with no indices beyond the PK.
--   The email worker queries: WHERE status = 'pending' OR (status = 'failed' AND retry_count < 3)
--   This is a full-table scan on every worker run. Add covering indices.

CREATE INDEX IF NOT EXISTS idx_outbox_status_created
  ON email_outbox(status, created_at);

CREATE INDEX IF NOT EXISTS idx_outbox_customer
  ON email_outbox(customer_id, status);
