-- Migration: 086_content_media_links_role.sql
-- Restores the `role` column to content_media_links, dropped in 044_media_engine_v1.sql.
--
-- HISTORY:
--   028_content_media_links_creation.sql — original table included role TEXT NOT NULL DEFAULT 'primary'
--   044_media_engine_v1.sql              — DROP TABLE IF EXISTS content_media_links, rebuilt without role
--   045_media_hardening.sql              — table rebuilt again, role still absent
--   No subsequent migration restored it.
--
-- IMPACT:
--   Without this column, resolver.js:37 throws:
--     D1_ERROR: no such column: l.role — SQLITE_ERROR
--   All delivery jobs that resolve media fail. Affects all 6 platform adapters:
--     platforms/linkedin.js, facebook.js, instagram.js, x.js, tiktok.js, pinterest.js
--
-- ROLLBACK:
--   SQLite / D1 does not support ALTER TABLE DROP COLUMN.
--   To roll back: rebuild the table via CREATE TABLE ... AS SELECT (excluding role),
--   DROP old table, RENAME. See 045_media_hardening.sql for the pattern.

ALTER TABLE content_media_links ADD COLUMN role TEXT NOT NULL DEFAULT 'primary';

-- No index added: `role` is consumed by JS-side .find() in platform adapters,
-- never used in a SQL WHERE or ORDER BY clause.
