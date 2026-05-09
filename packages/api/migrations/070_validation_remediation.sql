-- 070_validation_remediation.sql
-- Fixes critical structural issues identified during E2E validation

-- 1. content_context: Fix Foreign Key Mismatch
PRAGMA foreign_keys=OFF;
CREATE TABLE IF NOT EXISTS content_context_new (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  tone TEXT,
  audience TEXT,
  purpose TEXT,
  campaign_hint TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO content_context_new (id, brand_id, locale, tone, audience, purpose, campaign_hint, created_at, updated_at)
SELECT id, brand_id, locale, tone, audience, purpose, campaign_hint, created_at, updated_at 
FROM content_context;

DROP TABLE IF EXISTS content_context;
ALTER TABLE content_context_new RENAME TO content_context;

-- 2. social_variants: Add UNIQUE constraint for Upsert
CREATE TABLE IF NOT EXISTS social_variants_new (
  id TEXT PRIMARY KEY,
  social_asset_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT,
  aspect_ratio TEXT,
  duration_hint INTEGER,
  status TEXT CHECK (status IN ('draft', 'ready')) NOT NULL DEFAULT 'draft',
  FOREIGN KEY (social_asset_id) REFERENCES social_assets(id) ON DELETE CASCADE,
  UNIQUE(social_asset_id, platform)
);

INSERT OR IGNORE INTO social_variants_new 
SELECT id, social_asset_id, platform, caption, hashtags, aspect_ratio, duration_hint, status 
FROM social_variants;

DROP TABLE IF EXISTS social_variants;
ALTER TABLE social_variants_new RENAME TO social_variants;

-- 3. notification_reads: Create missing table
CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. notifications: Ensure message column
-- (Done in previous run, but here for completeness)
-- ALTER TABLE notifications ADD COLUMN message TEXT; 

PRAGMA foreign_keys=ON;
