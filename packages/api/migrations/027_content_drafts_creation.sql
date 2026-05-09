-- packages/api/migrations/027_content_drafts_creation.sql

-- Create the foundational content_drafts table (Canon 2)
CREATE TABLE IF NOT EXISTS content_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('social', 'blog')),
    content_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(content_type, content_id),
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- Seed content_drafts from existing social_assets and blog_posts if any exist
INSERT OR IGNORE INTO content_drafts (brand_id, content_type, content_id, state, created_at)
SELECT brand_id, 'social', id, status, created_at FROM social_assets;

INSERT OR IGNORE INTO content_drafts (brand_id, content_type, content_id, state, created_at)
SELECT brand_id, 'blog', id, status, created_at FROM blog_posts;
