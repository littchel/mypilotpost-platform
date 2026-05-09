-- packages/api/migrations/057_archetype_progression.sql

-- Evolution: Progressive Archetypes & Authentic Score Reasons
-- Transforms static identities into a Level 1-10 growth journey
ALTER TABLE brands ADD COLUMN archetype_level INTEGER DEFAULT 1;
ALTER TABLE brands ADD COLUMN archetype_exp INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN last_score_reasons TEXT; -- JSON array of outcome-based reasons

-- Indices for progression analysis
CREATE INDEX IF NOT EXISTS idx_brands_progression ON brands(archetype_level, archetype_exp);
