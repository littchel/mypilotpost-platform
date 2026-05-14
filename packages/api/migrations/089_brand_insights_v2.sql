-- Migration: 089_brand_insights_v2.sql
-- Reconciles schema divergence between:
--   047_brand_intelligence_v2.sql — created brand_insights (title, signature, expires_at set)
--   076_intelligence.sql          — defined fuller schema but IF NOT EXISTS was a no-op
--
-- PROBLEM:
--   076's CREATE TABLE IF NOT EXISTS was silently skipped (table existed from 047).
--   Its partial index on (brand_id) WHERE resolved = 0 then failed — no such column: resolved.
--   076 is backfilled in the tracker; this migration delivers its missing column effects.
--
-- ADDITIONAL COLUMNS (beyond 076):
--   resolved_at and resolved_by are referenced in handlers.js:40 (resolveInsight UPDATE)
--   but were absent from 076's schema definition. Included here to prevent a secondary
--   runtime failure when resolveInsight is called.
--
-- APPLICATION IMPACT:
--   engine.js  upsertInsight: WHERE resolved=0, UPDATE metadata/updated_at,
--                             INSERT action_link/metadata — all unblocked.
--   handlers.js resolveInsight: SET resolved=1, resolved_at, resolved_by — unblocked.
--   intelligence.js: uses title, signature, expires_at — all pre-existing, untouched.
--
-- ROLLBACK:
--   SQLite / D1 does not support ALTER TABLE DROP COLUMN.
--   To roll back: rebuild brand_insights excluding these columns (see 045 pattern).

ALTER TABLE brand_insights ADD COLUMN resolved    INTEGER DEFAULT 0;
ALTER TABLE brand_insights ADD COLUMN action_link TEXT;
ALTER TABLE brand_insights ADD COLUMN metadata    TEXT;
ALTER TABLE brand_insights ADD COLUMN updated_at  TEXT DEFAULT (datetime('now'));
ALTER TABLE brand_insights ADD COLUMN resolved_at TEXT;
ALTER TABLE brand_insights ADD COLUMN resolved_by TEXT;

-- Partial index from 076 — requires resolved column to exist first
CREATE INDEX IF NOT EXISTS idx_insights_brand_unresolved
  ON brand_insights(brand_id) WHERE resolved = 0;

-- Simple priority index from 076
CREATE INDEX IF NOT EXISTS idx_insights_priority ON brand_insights(priority);
