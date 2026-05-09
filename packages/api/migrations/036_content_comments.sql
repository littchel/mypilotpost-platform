-- Migration 036: Specialized Comments System for Agency-Grade Workflow
-- Supports threaded comments, internal/external visibility, and audit trails.

CREATE TABLE IF NOT EXISTS content_comments (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL,
    parent_id TEXT, -- For threading support
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK(type IN ('internal', 'external')) DEFAULT 'internal',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_comments_content ON content_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON content_comments(parent_id);
