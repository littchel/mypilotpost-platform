-- Migration: 045_media_hardening.sql
-- Description: Adds positioning, collision-safe constraints, and asset protection.

BEGIN TRANSACTION;

-- 1. Create a modern version of the linking table
-- We change ON DELETE CASCADE to ON DELETE RESTRICT to prevent deleting assets linked to content.
-- We add 'position' for deterministic ordering.
-- We refine 'UNIQUE' to include content_type for global safety.
CREATE TABLE content_media_links_new (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('social', 'blog')),
    media_id TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(content_id, content_type, media_id), 
    FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE RESTRICT
);

-- 2. Migrate existing data if present
INSERT INTO content_media_links_new (id, brand_id, content_id, content_type, media_id, created_at)
SELECT id, brand_id, content_id, content_type, media_id, created_at 
FROM content_media_links;

-- 3. Replace old table
DROP TABLE content_media_links;
ALTER TABLE content_media_links_new RENAME TO content_media_links;

-- 4. Restore indices
CREATE INDEX IF NOT EXISTS idx_content_media_links_content ON content_media_links (content_id);

-- 5. Optional Index for positioning performance
CREATE INDEX IF NOT EXISTS idx_content_media_links_pos ON content_media_links (content_id, position);

COMMIT;
