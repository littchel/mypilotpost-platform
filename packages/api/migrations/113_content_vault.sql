-- ============================================================
-- 113 — Content Vault (Unified Content Source of Truth)
-- All content creation surfaces write here.
-- delivery_jobs, approval_requests consume content_id from here.
-- ============================================================

CREATE TABLE IF NOT EXISTS content_vault (
  id                TEXT PRIMARY KEY,
  brand_id          TEXT NOT NULL,
  user_id           TEXT,
  content_type      TEXT NOT NULL DEFAULT 'social', -- social | blog | campaign
  title             TEXT,
  body              TEXT NOT NULL DEFAULT '',
  hook              TEXT,
  cta               TEXT,
  hashtags          TEXT DEFAULT '[]',       -- JSON string[]
  platforms         TEXT DEFAULT '[]',       -- JSON string[]
  platform_variants TEXT DEFAULT '{}',       -- JSON { platform: caption }
  media_ids         TEXT DEFAULT '[]',       -- JSON media_asset_id[]
  lifecycle_status  TEXT NOT NULL DEFAULT 'draft',
  scheduled_at      TEXT,
  published_at      TEXT,
  campaign_id       TEXT,
  metadata          TEXT DEFAULT '{}',       -- JSON blob (ai params, seo, etc.)
  version           INTEGER DEFAULT 1,
  source            TEXT DEFAULT 'editor',   -- editor | ai_studio | import
  created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at        TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_brand_status
  ON content_vault(brand_id, lifecycle_status, updated_at);

CREATE INDEX IF NOT EXISTS idx_vault_brand_type
  ON content_vault(brand_id, content_type);

CREATE INDEX IF NOT EXISTS idx_vault_scheduled
  ON content_vault(brand_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- Backfill: import existing social_assets into content_vault (idempotent)
INSERT OR IGNORE INTO content_vault
  (id, brand_id, user_id, content_type, title, body, lifecycle_status,
   campaign_id, source, created_at, updated_at)
SELECT
  id, brand_id, user_id, 'social', title,
  COALESCE(text, ''), COALESCE(lifecycle_status, 'draft'),
  campaign_id, 'import', created_at, updated_at
FROM social_assets;

-- Backfill: import existing blog_posts into content_vault (idempotent)
INSERT OR IGNORE INTO content_vault
  (id, brand_id, user_id, content_type, title, body, lifecycle_status,
   campaign_id, source, created_at, updated_at)
SELECT
  id, brand_id, user_id, 'blog', title,
  COALESCE(body, ''), COALESCE(lifecycle_status, 'draft'),
  campaign_id, 'import', created_at, updated_at
FROM blog_posts;
