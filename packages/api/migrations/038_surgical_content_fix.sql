-- Migration: 038_surgical_content_fix.sql
-- Description: Add campaign linking, approval tracking, and industry fallback support (SAFE ADDITIVE)

-- 1. ENHANCE brands
ALTER TABLE brands ADD COLUMN industry_other TEXT;

-- 2. ENHANCE social_assets
ALTER TABLE social_assets ADD COLUMN campaign_id TEXT;
ALTER TABLE social_assets ADD COLUMN approved_by TEXT;

-- 3. ENHANCE blog_posts
ALTER TABLE blog_posts ADD COLUMN campaign_id TEXT;
ALTER TABLE blog_posts ADD COLUMN approved_by TEXT;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_social_campaign ON social_assets (campaign_id);
CREATE INDEX IF NOT EXISTS idx_blog_campaign ON blog_posts (campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_status ON social_assets (status);
CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_posts (status);
