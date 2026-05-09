-- =========================================================
-- Campaign Engine Optimizations
-- Migration: 049_campaign_engine_optimizations.sql
-- =========================================================

-- 1. Add score column to performance cache
-- This allows instant retrieval of campaign rankings in the list view
ALTER TABLE campaign_metrics_cache ADD COLUMN score INTEGER DEFAULT 0;

-- 2. Migration Record
INSERT INTO d1_migrations (name, applied_at)
VALUES ('049_campaign_engine_optimizations', CURRENT_TIMESTAMP);
