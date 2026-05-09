-- =====================================================
-- AI Brand Intelligence Cache
-- Migration: 053_ai_intelligence_cache.sql
-- Purpose: 
--  1. Cache AI-generated strategic insights
--  2. Enforce cooldown and cost-control measures
--  3. Store explainability drivers and confidence guards
-- =====================================================

-- 1) Brand AI Cache Table
-- Stores expensive LLM results for rapid retrieval
CREATE TABLE IF NOT EXISTS brand_ai_cache (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  
  type TEXT NOT NULL, 
  -- strategic, campaign, weekly
  
  context_id TEXT, 
  -- Optional: campaign_id or entity_id
  
  content TEXT NOT NULL, 
  -- JSON: { summary, recommendations[], confidence, drivers[] }
  
  last_generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_brand ON brand_ai_cache (brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_type ON brand_ai_cache (brand_id, type, context_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expiry ON brand_ai_cache (expires_at);

-- 2) Migration Record
INSERT INTO d1_migrations (name, applied_at)
VALUES ('053_ai_intelligence_cache', CURRENT_TIMESTAMP);
