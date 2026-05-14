-- Migration: 099_ai_usage_tracking.sql
-- Extends ai_generations with usage tracking, provider metadata, and latency.
--
-- ai_generations additions:
--   user_id       — the user who triggered the generation
--   provider      — 'groq' | 'openai' | 'anthropic' (default groq)
--   latency_ms    — wall-clock time for the LLM call
--   success       — 1 = generation succeeded, 0 = failed/fallback
--   cost_usd      — estimated cost in USD (NULL = unknown)
--   status        — 'ok' | 'fallback' | 'failed'
--
-- ai_usage_quota: per-user daily quota tracking for rate limiting
CREATE TABLE IF NOT EXISTS ai_usage_quota (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT NOT NULL,
  brand_id    TEXT NOT NULL,
  date        TEXT NOT NULL,              -- YYYY-MM-DD
  generation_count INTEGER NOT NULL DEFAULT 0,
  token_count      INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, brand_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ai_quota_user ON ai_usage_quota(user_id, date);

-- Extend ai_generations with per-request observability
ALTER TABLE ai_generations ADD COLUMN user_id     TEXT;
ALTER TABLE ai_generations ADD COLUMN provider    TEXT NOT NULL DEFAULT 'groq';
ALTER TABLE ai_generations ADD COLUMN latency_ms  INTEGER;
ALTER TABLE ai_generations ADD COLUMN success     INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ai_generations ADD COLUMN cost_usd    REAL;
ALTER TABLE ai_generations ADD COLUMN status      TEXT NOT NULL DEFAULT 'ok';
