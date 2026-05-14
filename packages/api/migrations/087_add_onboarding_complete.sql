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

ALTER TABLE users
ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0;
