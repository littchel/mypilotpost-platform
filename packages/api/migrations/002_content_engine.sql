-- =========================================================
-- Milestone 1: Core Content Engine
-- Database: mypilotpost_admin
-- =========================================================

PRAGMA foreign_keys = ON;

-- 1. Shared Content Context
CREATE TABLE IF NOT EXISTS content_context (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  tone TEXT,
  audience TEXT,
  purpose TEXT,
  campaign_hint TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES customers(brand_id)
);

-- 2. Social Asset Bundles
CREATE TABLE IF NOT EXISTS social_assets (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  context_id TEXT NOT NULL,
  title TEXT,
  status TEXT CHECK (status IN ('draft', 'enriched', 'ready')) NOT NULL DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES customers(brand_id),
  FOREIGN KEY (context_id) REFERENCES content_context(id)
);

-- 3. Platform Variants
CREATE TABLE IF NOT EXISTS social_variants (
  id TEXT PRIMARY KEY,
  social_asset_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT,
  aspect_ratio TEXT,
  duration_hint INTEGER,
  status TEXT CHECK (status IN ('draft', 'ready')) NOT NULL DEFAULT 'draft',
  FOREIGN KEY (social_asset_id) REFERENCES social_assets(id)
);

-- 4. Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  context_id TEXT NOT NULL,
  title TEXT,
  slug TEXT,
  body TEXT,
  status TEXT CHECK (
    status IN ('draft', 'structured', 'reviewed', 'published')
  ) NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES customers(brand_id),
  FOREIGN KEY (context_id) REFERENCES content_context(id)
);

-- 5. Media References (External Only)
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  provider TEXT CHECK (provider IN ('canva', 'gdrive', 'dropbox', 'upload')) NOT NULL,
  external_id TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  type TEXT CHECK (type IN ('image', 'video')) NOT NULL,
  aspect_ratio TEXT,
  duration INTEGER,
  recommended_platforms TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES customers(brand_id)
);

-- 6. Social ↔ Media Links
CREATE TABLE IF NOT EXISTS social_media_links (
  social_asset_id TEXT NOT NULL,
  media_asset_id TEXT NOT NULL,
  PRIMARY KEY (social_asset_id, media_asset_id),
  FOREIGN KEY (social_asset_id) REFERENCES social_assets(id),
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id)
);

-- 7. Blog ↔ Media Links
CREATE TABLE IF NOT EXISTS blog_media_links (
  blog_post_id TEXT NOT NULL,
  media_asset_id TEXT NOT NULL,
  PRIMARY KEY (blog_post_id, media_asset_id),
  FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id),
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id)
);

-- 8. Missions Extension
ALTER TABLE missions ADD COLUMN entity_type TEXT;
ALTER TABLE missions ADD COLUMN entity_id TEXT;

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_content_context_brand
  ON content_context (brand_id);

CREATE INDEX IF NOT EXISTS idx_social_assets_brand
  ON social_assets (brand_id);

CREATE INDEX IF NOT EXISTS idx_blog_posts_brand
  ON blog_posts (brand_id);

CREATE INDEX IF NOT EXISTS idx_missions_entity
  ON missions (entity_type, entity_id);
