-- Migration: 133_generation_repair.sql
-- Extends ai_generations with lineage tracking, quality scoring, and context deduplication.

-- Rewrite/regenerate lineage
ALTER TABLE ai_generations ADD COLUMN parent_generation_id TEXT;

-- Quality score stored at generation time (0-100 integer)
ALTER TABLE ai_generations ADD COLUMN quality_score INTEGER;

-- SHA-256 hash of (brand_id + content_type + intent) for repeat-prompt detection
ALTER TABLE ai_generations ADD COLUMN generation_context_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_gen_parent   ON ai_generations(parent_generation_id);
CREATE INDEX IF NOT EXISTS idx_ai_gen_hash     ON ai_generations(brand_id, generation_context_hash);
CREATE INDEX IF NOT EXISTS idx_ai_gen_brand_ct ON ai_generations(brand_id, content_type, created_at);
