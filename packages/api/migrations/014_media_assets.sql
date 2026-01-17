-- =========================================
-- Milestone 4: Media & Canva Integration
-- Migration: 009_media_assets.sql
-- Status: FINAL
-- =========================================

-- Media assets (metadata only)
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  provider TEXT NOT NULL,       -- canva | gdrive | dropbox | upload
  external_id TEXT NOT NULL,    -- provider asset ID
  url TEXT NOT NULL,            -- CDN / share URL
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_brand ON media_assets(brand_id);
CREATE INDEX IF NOT EXISTS idx_media_provider ON media_assets(provider);

-- Social asset ↔ media join
CREATE TABLE IF NOT EXISTS social_media (
  id TEXT PRIMARY KEY,
  social_asset_id TEXT NOT NULL,
  media_asset_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (social_asset_id) REFERENCES social_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_media_unique
ON social_media(social_asset_id, media_asset_id);
