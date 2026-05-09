-- Migration: 041_delivery_hardening.sql
-- Description: Adds delivery_results tracking and enhances system reliability indices.

-- 1. Add delivery_results to social_assets
ALTER TABLE social_assets ADD COLUMN delivery_results TEXT;

-- 2. Add delivery_results to blog_posts
ALTER TABLE blog_posts ADD COLUMN delivery_results TEXT;

-- 3. Update delivery_failures to ensure parity (standardizing)
-- (It already has job_id, content_id, platform, error_message, created_at)

-- 4. Indices for performance
CREATE INDEX IF NOT EXISTS idx_social_assets_brand_status ON social_assets (brand_id, status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_brand_status ON blog_posts (brand_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_content_status ON delivery_jobs (content_id, status);
