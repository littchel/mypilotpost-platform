-- Migration: 088_approval_requests_v2.sql
-- Reconciles approval_requests schema conflict between:
--   071_saas_multi_tenant_hardening.sql — created the table without status/reviewer columns
--   073_approvals.sql — defined a fuller schema but was silently skipped (IF NOT EXISTS)
--
-- PROBLEM:
--   073's CREATE TABLE IF NOT EXISTS was a no-op (table existed from 071).
--   Its index on (brand_id, status) then failed — no such column: status.
--   073 is backfilled in the tracker; this migration delivers its missing column effects.
--
-- APPLICATION IMPACT:
--   core/approvals/handlers.js:26 INSERTs reviewer_type and review_notes — both missing
--   today, causing runtime failures. This migration unblocks those calls.
--   core/content/social.js INSERTs omit these columns — DEFAULTs apply correctly.
--   No application code reads status by name in a WHERE clause.
--
-- ROLLBACK:
--   SQLite / D1 does not support ALTER TABLE DROP COLUMN.
--   To roll back: rebuild approval_requests excluding these columns (see 045 pattern).

ALTER TABLE approval_requests ADD COLUMN status       TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE approval_requests ADD COLUMN reviewer_type TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE approval_requests ADD COLUMN reviewer_id   TEXT;
ALTER TABLE approval_requests ADD COLUMN review_notes  TEXT;
ALTER TABLE approval_requests ADD COLUMN updated_at    TEXT NOT NULL DEFAULT (datetime('now'));

-- Recreate the index from 073 that previously failed
CREATE INDEX IF NOT EXISTS idx_approval_brand ON approval_requests(brand_id, status);
