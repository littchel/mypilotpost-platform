-- Migration: 044_media_engine_v1.sql
-- Description: Establishes a lightweight, reusable media registry and linking system.

-- 1. Drop existing tables if they exist (Surgical reset for Phase 1)
DROP TABLE IF EXISTS content_media_links;
DROP TABLE IF EXISTS media_assets;

-- 2. Create media_assets (LIGHTWEIGHT REGISTRY)
CREATE TABLE media_assets (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- freepik, google_drive, dropbox
    external_id TEXT NOT NULL,
    preview_url TEXT NOT NULL,
    mime_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, provider, external_id) -- IDEMPOTENCY GUARD
);

-- 3. Create content_media_links (M:N ATTACHMENT)
CREATE TABLE content_media_links (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL, -- For easier lookups
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('social', 'blog')),
    media_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(content_id, media_id), -- PREVENT DUPLICATE LINKS
    FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

-- 4. Indices for performance
CREATE INDEX IF NOT EXISTS idx_media_assets_brand ON media_assets (brand_id);
CREATE INDEX IF NOT EXISTS idx_content_media_links_content ON content_media_links (content_id);
