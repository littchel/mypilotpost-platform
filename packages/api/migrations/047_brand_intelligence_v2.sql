-- =====================================================
-- Brand Intelligence Engine (v2)
-- Migration: 047_brand_intelligence_v2.sql
-- Purpose: 
--  1. Store strategic customer-facing insights
--  2. Enable deduplication and auto-expiry
--  3. Implement caching control for analytical runs
-- =====================================================

-- 1) Brand Insights Table
-- Stores customer-facing strategic findings
CREATE TABLE IF NOT EXISTS brand_insights (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  
  type TEXT NOT NULL, 
  -- standardized: growth, warning, opportunity, consistency, performance
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  priority TEXT NOT NULL, 
  -- high, medium, low
  
  signature TEXT NOT NULL,
  -- brand_id + type + title (unique identifier for deduplication)
  
  expires_at DATETIME,
  -- Lifecycle control: manual or auto pruning
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insights_brand ON brand_insights (brand_id);
CREATE INDEX IF NOT EXISTS idx_insights_signature ON brand_insights (signature);
CREATE INDEX IF NOT EXISTS idx_insights_expiry ON brand_insights (expires_at);

-- 2) Intelligence Runtime Cache
-- Add last_run_at to brands to prevent expensive re-calculation
ALTER TABLE brands ADD COLUMN last_intelligence_run_at DATETIME;

-- 3) Migration Record
INSERT INTO d1_migrations (name, applied_at)
VALUES ('047_brand_intelligence_v2', CURRENT_TIMESTAMP);
