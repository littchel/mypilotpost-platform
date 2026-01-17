-- =========================================
-- Milestone 3: Content Engine Hardening
-- Migration: 008_content_hardening.sql
-- Status: FINAL
-- =========================================

-- Canonical content status
ALTER TABLE social_assets ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE blog_posts ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';

-- Version history (immutable)
CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'social' | 'blog'
  version INTEGER NOT NULL,
  payload TEXT NOT NULL,      -- JSON snapshot
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_versions_content
ON content_versions(content_id, content_type);

-- Publishing guardrails
CREATE INDEX IF NOT EXISTS idx_social_status ON social_assets(status);
CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_posts(status);
