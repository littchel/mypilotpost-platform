-- Migration: 037_update_status_constraints.sql
-- Description: Align status constraints and add text column to social_assets

PRAGMA foreign_keys = OFF;

-- 1. STABILIZE social_assets
CREATE TABLE social_assets_new (
  id           TEXT PRIMARY KEY,
  brand_id     TEXT NOT NULL,
  context_id   TEXT NOT NULL,
  title        TEXT,
  text         TEXT, -- New canonical content column
  status       TEXT CHECK (status IN (
    'draft','enriched','ready','approval','approved','scheduled','published','failed'
  )) NOT NULL DEFAULT 'draft',
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Copy data and backfill 'text' from 'title'
INSERT INTO social_assets_new (id, brand_id, context_id, title, text, status, created_at, updated_at)
SELECT id, brand_id, context_id, title, COALESCE(title, '[No Content]'), status, created_at, updated_at
FROM social_assets;

DROP TABLE social_assets;
ALTER TABLE social_assets_new RENAME TO social_assets;

-- 2. STABILIZE blog_posts
CREATE TABLE blog_posts_new (
  id           TEXT PRIMARY KEY,
  brand_id     TEXT NOT NULL,
  context_id   TEXT NOT NULL,
  title        TEXT,
  slug         TEXT,
  body         TEXT,
  status       TEXT CHECK (status IN (
    'draft','structured','reviewed','approval','approved','scheduled','published','failed'
  )) NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO blog_posts_new (id, brand_id, context_id, title, slug, body, status, published_at, created_at, updated_at)
SELECT id, brand_id, context_id, title, slug, body, status, published_at, created_at, updated_at
FROM blog_posts;

DROP TABLE blog_posts;
ALTER TABLE blog_posts_new RENAME TO blog_posts;

PRAGMA foreign_keys = ON;
