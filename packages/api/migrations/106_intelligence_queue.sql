-- Migration: 106_intelligence_queue.sql
-- Purpose: Brand Intelligence progressive delivery queue
--
-- Stores all AI-generated intelligence items individually so the
-- progressive delivery engine can reveal them across sessions.
-- One generation cycle per day per brand. Each item is delivered once
-- and tracked independently.

CREATE TABLE IF NOT EXISTS brand_intelligence_queue (
  id               TEXT PRIMARY KEY,
  brand_id         TEXT NOT NULL,
  batch_id         TEXT NOT NULL,     -- groups all items from one generation cycle

  -- Classification
  module_id        TEXT NOT NULL,     -- platform_health | content_intelligence | etc.
  category         TEXT NOT NULL,
  is_notification  INTEGER DEFAULT 0, -- 1 = notification center item

  -- Intelligence content (matches IntelligenceObject standard)
  title            TEXT NOT NULL,
  finding          TEXT NOT NULL,
  why_it_matters   TEXT,
  evidence_json    TEXT,              -- JSON array of strings
  confidence       TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  expected_impact  TEXT,
  priority         TEXT DEFAULT 'medium',
  priority_rank    INTEGER DEFAULT 2, -- 1=high 2=medium 3=low (for ORDER BY)

  -- Notification extras
  notification_type   TEXT,           -- urgent | warning | opportunity | win
  notification_body   TEXT,
  notification_action TEXT,

  -- Delivery tracking
  generated_at     TEXT NOT NULL,
  delivered_at     TEXT,              -- NULL = not yet shown to user
  dismissed_at     TEXT,             -- NULL = not dismissed

  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_biq_brand_batch
  ON brand_intelligence_queue (brand_id, batch_id);

CREATE INDEX IF NOT EXISTS idx_biq_brand_delivery
  ON brand_intelligence_queue (brand_id, delivered_at, dismissed_at);

CREATE INDEX IF NOT EXISTS idx_biq_priority
  ON brand_intelligence_queue (brand_id, priority_rank, created_at);
