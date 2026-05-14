-- packages/api/migrations/059_ai_performance_memory.sql

-- Strategic Hardening: AI Production Pro-Elite Architecture
-- Provisions brand-level memory for intelligent model prioritization and zero-error fallbacks
ALTER TABLE brands ADD COLUMN last_ai_model TEXT; -- 'llama3-70b-8192' or 'llama3-8b-8192'
ALTER TABLE brands ADD COLUMN last_ai_success_at DATETIME; -- For 24h reset logic
ALTER TABLE brands ADD COLUMN first_ai_run_at DATETIME; -- Priority detection for first impression

-- Tracking for internal audit/performance (No user exposure)
ALTER TABLE brands ADD COLUMN last_ai_performance_logs TEXT; -- JSON: { model, path, latency, fallback_triggered }

-- Cache Hardening: TTL & Priority Support
ALTER TABLE brand_ai_cache ADD COLUMN priority TEXT DEFAULT 'normal'; -- 'high' (reports) vs 'normal' (dashboard)
ALTER TABLE brand_ai_cache ADD COLUMN source TEXT DEFAULT 'ai'; -- 'ai', 'fallback', 'limited'
-- last_generated_at already present from 053_ai_intelligence_cache.sql CREATE TABLE

-- Indices for rapid success-memory lookup
CREATE INDEX IF NOT EXISTS idx_brands_ai_memory ON brands(last_ai_success_at, first_ai_run_at);
