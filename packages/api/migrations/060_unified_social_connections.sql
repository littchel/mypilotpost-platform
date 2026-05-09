-- Unified Social Connection System Migration
-- Migration: 060_unified_social_connections.sql

CREATE TABLE IF NOT EXISTS social_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'google', 'meta', 'linkedin', 'x', 'tiktok', 'pinterest'
  account_id TEXT NOT NULL, -- Platform's internal ID
  platform_username TEXT,
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- Encrypted
  expires_at DATETIME,
  last_refreshed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  scopes TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked', 'error'
  meta TEXT, -- JSON blob for profile pics, page info, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint for UPSERT logic
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_connections_unique 
ON social_connections (brand_id, platform, account_id);

-- Speed up lookups for refresh engine and ownership checks
CREATE INDEX IF NOT EXISTS idx_social_connections_user_brand ON social_connections (user_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON social_connections (platform);
CREATE INDEX IF NOT EXISTS idx_social_connections_expiry ON social_connections (expires_at);
