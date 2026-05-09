-- packages/api/migrations/028_content_media_links_creation.sql

-- Create the content_media_links table (Canon 3)
CREATE TABLE IF NOT EXISTS content_media_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('social', 'blog')),
    content_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'primary',
    locked INTEGER NOT NULL DEFAULT 0, -- 0 = unlocked, 1 = locked on schedule
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

-- Index for fast lookup by content
CREATE INDEX IF NOT EXISTS idx_content_media_links_content ON content_media_links(content_type, content_id);
