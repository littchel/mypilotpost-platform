-- packages/api/migrations/032_analytics_schema_enhancement.sql

-- Add missing dimensions and metrics to content_analytics
-- Rules: Additive only. No data loss.

ALTER TABLE content_analytics ADD COLUMN platform TEXT;
ALTER TABLE content_analytics ADD COLUMN comments INTEGER DEFAULT 0;
ALTER TABLE content_analytics ADD COLUMN shares INTEGER DEFAULT 0;
ALTER TABLE content_analytics ADD COLUMN saves INTEGER DEFAULT 0;
ALTER TABLE content_analytics ADD COLUMN reported_at TEXT;

-- Recommended indexes for performant trends and breakdowns
CREATE INDEX idx_content_analytics_reported_at ON content_analytics(reported_at);
CREATE INDEX idx_content_analytics_brand_platform ON content_analytics(brand_id, platform);
CREATE INDEX idx_content_analytics_brand_type ON content_analytics(brand_id, content_type);
