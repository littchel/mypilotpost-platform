-- Migration: 144_commercial_catalog_cleanup.sql
-- Cleans up redundant capitalized feature catalog keys and restores correct programmatic entitlements for Dominance plan

-- 1. Delete redundant capitalized features and entitlements
DELETE FROM plan_entitlements WHERE feature_key IN (
  'AI_Content_Studio', 'Adobe_Express_Integration', 'Analytics_&_Reporting', 'Approvals_&_Reviews',
  'Brand_Intelligence', 'Campaign_Reporting', 'Canva_Integration', 'Content_Drafts_&_Versions',
  'Content_Scheduling', 'Free_Image_Library_(Pexels)', 'Multi-Brand_Access', 'Multi-Platform_Publishing',
  'Publishing_Monitoring', 'SEO_Center', 'Team_Collaboration', 'Unlimited_Social_Posts_&_Articles'
);

DELETE FROM plan_features WHERE key IN (
  'AI_Content_Studio', 'Adobe_Express_Integration', 'Analytics_&_Reporting', 'Approvals_&_Reviews',
  'Brand_Intelligence', 'Campaign_Reporting', 'Canva_Integration', 'Content_Drafts_&_Versions',
  'Content_Scheduling', 'Free_Image_Library_(Pexels)', 'Multi-Brand_Access', 'Multi-Platform_Publishing',
  'Publishing_Monitoring', 'SEO_Center', 'Team_Collaboration', 'Unlimited_Social_Posts_&_Articles'
);

-- 2. Restore/enable real programmatic lowercase entitlements for Dominance plan
INSERT OR REPLACE INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type) VALUES
  ('dominance', 'social_posts', 1, NULL, 'monthly'),
  ('dominance', 'ai_content', 1, NULL, 'monthly'),
  ('dominance', 'brands', 1, 10, 'count'),
  ('dominance', 'users', 1, 20, 'count'),
  ('dominance', 'campaigns', 1, NULL, 'boolean'),
  ('dominance', 'approvals', 1, NULL, 'boolean'),
  ('dominance', 'analytics', 1, NULL, 'boolean'),
  ('dominance', 'seo', 1, NULL, 'boolean'),
  ('dominance', 'intelligence', 1, NULL, 'boolean'),
  ('dominance', 'white_label', 1, NULL, 'boolean'),
  ('dominance', 'api_access', 1, NULL, 'boolean'),
  ('dominance', 'storage', 1, 50, 'storage'),
  ('dominance', 'workspaces', 1, NULL, 'boolean'),
  ('dominance', 'drafts_versions', 1, NULL, 'boolean'),
  ('dominance', 'canva', 1, NULL, 'boolean'),
  ('dominance', 'adobe_express', 1, NULL, 'boolean'),
  ('dominance', 'pexels', 1, NULL, 'boolean'),
  ('dominance', 'scheduling', 1, NULL, 'boolean'),
  ('dominance', 'monitoring', 1, NULL, 'boolean'),
  ('dominance', 'campaign_reports', 1, NULL, 'boolean');
