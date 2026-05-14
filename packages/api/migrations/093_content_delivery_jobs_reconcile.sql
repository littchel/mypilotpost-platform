-- Migration: 093_content_delivery_jobs_reconcile.sql
-- Reconciles schema damage from phase4_admin_compat.sql.
--
-- PROBLEM:
--   phase4_admin_compat.sql dropped and recreated content_delivery_jobs with a
--   minimal schema: (id PK, customer_id, platform, state, created_at).
--   This stripped 5 columns required by social.js postNow and drafts.js getScheduled:
--     content_id, brand_id, user_id, scheduled_at, content_type
--
-- APPROACH: additive ALTER TABLE ADD COLUMN — no table rebuild.
--   Existing rows receive NULL. social.js:205 INSERT provides all values for new rows.
--   drafts.js getScheduled is not currently routed (latent) — unblocked for future use.
--
-- NOTE: getScheduled is imported in server.js:113 but has no active route handler.
--   It will fail with runtime-breaking SQL if a route is added before this migration.
--
-- ROLLBACK: SQLite / D1 does not support ALTER TABLE DROP COLUMN.

-- content_id, scheduled_at already in 005_analytics.sql CREATE TABLE
-- brand_id, user_id already added by 071_saas_multi_tenant_hardening.sql
ALTER TABLE content_delivery_jobs ADD COLUMN content_type TEXT;

CREATE INDEX IF NOT EXISTS idx_cdj_brand_user   ON content_delivery_jobs(brand_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cdj_content      ON content_delivery_jobs(content_id);
CREATE INDEX IF NOT EXISTS idx_cdj_scheduled_at ON content_delivery_jobs(scheduled_at);
