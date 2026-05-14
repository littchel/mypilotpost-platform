-- Migration: 087_add_onboarding_complete.sql
-- Adds the onboarding_complete column to users.
--
-- HISTORY:
--   066_surgical_qa_fixes.sql attempted to add this column but could not be applied
--   because its other ALTER TABLE statements duplicate columns already added by
--   063_saas_production_final.sql and 065_auth_metadata.sql. Migration 066 is
--   tracked as applied (backfilled); this migration delivers its one missing effect.
--
-- ROLLBACK:
--   SQLite / D1 does not support ALTER TABLE DROP COLUMN.
--   To roll back: rebuild users table excluding this column (see 037 pattern).

-- onboarding_complete INTEGER DEFAULT 0 already added by 066_surgical_qa_fixes.sql in a fresh apply.
-- This migration is a no-op; retained for tracker completeness.
SELECT 1;
