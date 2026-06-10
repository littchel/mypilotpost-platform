-- 123_growth_engine_hardening.sql
-- Growth Engine Certification — schema notes and index additions.
--
-- CODE FIXES (in this release, not SQL):
--   intelligence.js:364  — audit_generated event now includes user_id (was silently dropped)
--   public_approval.js   — content_vault SELECT now includes user_id (was falling back to 'system')
--   engine.js            — daily_login has per-day dedup guard (was awarding points on every login)
--   intelligence/handlers.js — insight_resolved event now uses meta: key (was metadata:, lost context)
--   experience/growth.js — dead awardPoints() + POINT_VALUES removed (wrote to orphaned growth_activity_log)
--
-- SCHEMA NOTE: growth_activity has two metadata columns:
--   'metadata' — created by 075_growth.sql, unreferenced dead storage
--   'meta'     — added by 090_growth_engine_v2.sql, used by engine.js (canonical)
--   Both coexist; SQLite ALTER TABLE DROP COLUMN not supported in D1.
--
-- INDEX: add covering index for the daily_login dedup query added to engine.js.

CREATE INDEX IF NOT EXISTS idx_growth_activity_dedup
  ON growth_activity(user_id, brand_id, action_type, created_at);
