-- =====================================================
-- Milestone 5: Brand Intelligence Engine (Memory)
-- Migration: 007_brand_intelligence.sql
-- Database: Cloudflare D1 (SQLite)
-- Status: FINAL / LOCKED
--
-- PURPOSE:
-- Introduce persistent, explainable, append-only
-- brand memory across content, campaigns, delivery,
-- SEO, and analytics.
--
-- NON-GOALS:
-- - No ML
-- - No predictions
-- - No automation
-- - No customer-facing logic
-- - No mutation of historical facts
-- =====================================================


-- =====================================================
-- 1) brand_memory_events
-- Atomic, immutable factual events
-- Source of truth for all brand memory
-- =====================================================

CREATE TABLE IF NOT EXISTS brand_memory_events (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  event_type TEXT NOT NULL,
  -- content_published
  -- content_performed
  -- campaign_completed
  -- delivery_failed
  -- seo_rank_changed

  source_engine TEXT NOT NULL,
  -- content | seo | campaign | delivery | analytics

  entity_type TEXT NOT NULL,
  -- blog | social | campaign | keyword | platform

  entity_id TEXT NOT NULL,

  snapshot TEXT NOT NULL,
  -- JSON string: immutable metrics snapshot at time of event

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bme_brand
  ON brand_memory_events (brand_id);

CREATE INDEX IF NOT EXISTS idx_bme_event_type
  ON brand_memory_events (event_type);

CREATE INDEX IF NOT EXISTS idx_bme_entity
  ON brand_memory_events (entity_type, entity_id);



-- =====================================================
-- 2) brand_patterns
-- Human-explainable patterns derived from memory
-- Rules-based only (NOT ML)
-- =====================================================

CREATE TABLE IF NOT EXISTS brand_patterns (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  pattern_type TEXT NOT NULL,
  -- format_preference
  -- platform_strength
  -- timing_effectiveness
  -- objective_alignment
  -- delivery_risk

  description TEXT NOT NULL,
  -- Example:
  -- "Carousel posts outperform single-image posts on Instagram"

  supporting_event_count INTEGER NOT NULL,
  confidence_score REAL NOT NULL,
  -- Range: 0.0 → 1.0

  first_seen DATETIME NOT NULL,
  last_confirmed DATETIME NOT NULL,

  status TEXT NOT NULL DEFAULT 'active'
  -- active | degraded | obsolete
);

CREATE INDEX IF NOT EXISTS idx_bp_brand
  ON brand_patterns (brand_id);

CREATE INDEX IF NOT EXISTS idx_bp_type
  ON brand_patterns (pattern_type);

CREATE INDEX IF NOT EXISTS idx_bp_status
  ON brand_patterns (status);



-- =====================================================
-- 3) brand_preferences
-- Stable brand traits (declared + inferred via rules)
-- Slow-changing, human-readable
-- =====================================================

CREATE TABLE IF NOT EXISTS brand_preferences (
  brand_id TEXT PRIMARY KEY,

  tone TEXT,
  -- professional | friendly | bold | playful | neutral

  preferred_platforms TEXT,
  avoided_platforms TEXT,

  preferred_content_types TEXT,
  preferred_locales TEXT,

  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NOTE:
-- All list fields are JSON strings
-- This avoids premature normalization and schema rigidity



-- =====================================================
-- 4) brand_performance_summary
-- Derived, rebuildable read model
-- NEVER authoritative
-- =====================================================

CREATE TABLE IF NOT EXISTS brand_performance_summary (
  brand_id TEXT PRIMARY KEY,

  best_platform TEXT,
  best_content_type TEXT,
  worst_platform TEXT,

  success_rate REAL,
  failure_rate REAL,

  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- GUARANTEES:
-- - Append-only factual memory
-- - No destructive operations
-- - No foreign key coupling
-- - Safe across engine evolution
-- - ML-ready without ML dependency
--
-- After this migration:
-- The platform REMEMBERS.
