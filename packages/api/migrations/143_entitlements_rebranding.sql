-- Migration: 143_entitlements_rebranding.sql
-- Renames categories and display names in plan_features, and adds new features and their entitlements

-- Update existing feature names and categories
UPDATE plan_features SET name = 'Social Posts & Articles', category = 'CREATE CONTENT', updated_at = datetime('now') WHERE key = 'social_posts';
UPDATE plan_features SET name = 'AI Content Studio', category = 'CREATE CONTENT', updated_at = datetime('now') WHERE key = 'ai_content';
UPDATE plan_features SET name = 'Multi-Platform Publishing', category = 'SCHEDULE & PUBLISH', updated_at = datetime('now') WHERE key = 'campaigns';
UPDATE plan_features SET name = 'Team Collaboration', category = 'COLLABORATE & APPROVE', updated_at = datetime('now') WHERE key = 'users';
UPDATE plan_features SET name = 'Approvals & Reviews', category = 'COLLABORATE & APPROVE', updated_at = datetime('now') WHERE key = 'approvals';
UPDATE plan_features SET name = 'Multi-Brand Access', category = 'COLLABORATE & APPROVE', updated_at = datetime('now') WHERE key = 'brands';
UPDATE plan_features SET name = 'Analytics & Reporting', category = 'REPORTING & INSIGHTS', updated_at = datetime('now') WHERE key = 'analytics';
UPDATE plan_features SET name = 'SEO Center', category = 'REPORTING & INSIGHTS', updated_at = datetime('now') WHERE key = 'seo';
UPDATE plan_features SET name = 'Brand Intelligence', category = 'REPORTING & INSIGHTS', updated_at = datetime('now') WHERE key = 'intelligence';

-- Update other categories to uppercase to be clean and consistent
UPDATE plan_features SET category = 'ADVANCED', updated_at = datetime('now') WHERE key = 'white_label';
UPDATE plan_features SET category = 'ADVANCED', updated_at = datetime('now') WHERE key = 'api_access';
UPDATE plan_features SET category = 'STORAGE', updated_at = datetime('now') WHERE key = 'storage';
UPDATE plan_features SET category = 'ADVANCED', updated_at = datetime('now') WHERE key = 'workspaces';

-- Insert new features (omitting adobe_stock)
INSERT OR IGNORE INTO plan_features (key, name, description, category, visible, created_at, updated_at) VALUES
  ('drafts_versions', 'Content Drafts & Versions', 'Manage multiple drafts and version history', 'CREATE CONTENT', 1, datetime('now'), datetime('now')),
  ('canva', 'Canva Integration', 'Create and edit visual assets natively using Canva', 'DESIGN & MANAGE MEDIA', 1, datetime('now'), datetime('now')),
  ('adobe_express', 'Adobe Express Integration', 'Create design assets using Adobe Express', 'DESIGN & MANAGE MEDIA', 1, datetime('now'), datetime('now')),
  ('pexels', 'Free Image Library (Pexels)', 'Search and import free stock photos from Pexels', 'DESIGN & MANAGE MEDIA', 1, datetime('now'), datetime('now')),
  ('scheduling', 'Content Scheduling', 'Schedule posts ahead of time with smart slot booking', 'SCHEDULE & PUBLISH', 1, datetime('now'), datetime('now')),
  ('monitoring', 'Publishing Monitoring', 'Track status and get live alerts on post publication', 'SCHEDULE & PUBLISH', 1, datetime('now'), datetime('now')),
  ('campaign_reports', 'Campaign Reporting', 'Analyze performance aggregates for campaigns', 'REPORTING & INSIGHTS', 1, datetime('now'), datetime('now'));

-- Insert entitlements for new features
-- Starter
INSERT OR IGNORE INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type) VALUES
  ('starter', 'drafts_versions', 1, NULL, 'boolean'),
  ('starter', 'canva', 1, NULL, 'boolean'),
  ('starter', 'adobe_express', 1, NULL, 'boolean'),
  ('starter', 'pexels', 1, NULL, 'boolean'),
  ('starter', 'scheduling', 1, NULL, 'boolean'),
  ('starter', 'monitoring', 1, NULL, 'boolean'),
  ('starter', 'campaign_reports', 0, NULL, 'boolean');

-- Growth
INSERT OR IGNORE INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type) VALUES
  ('growth', 'drafts_versions', 1, NULL, 'boolean'),
  ('growth', 'canva', 1, NULL, 'boolean'),
  ('growth', 'adobe_express', 1, NULL, 'boolean'),
  ('growth', 'pexels', 1, NULL, 'boolean'),
  ('growth', 'scheduling', 1, NULL, 'boolean'),
  ('growth', 'monitoring', 1, NULL, 'boolean'),
  ('growth', 'campaign_reports', 1, NULL, 'boolean');

-- Pro
INSERT OR IGNORE INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type) VALUES
  ('pro', 'drafts_versions', 1, NULL, 'boolean'),
  ('pro', 'canva', 1, NULL, 'boolean'),
  ('pro', 'adobe_express', 1, NULL, 'boolean'),
  ('pro', 'pexels', 1, NULL, 'boolean'),
  ('pro', 'scheduling', 1, NULL, 'boolean'),
  ('pro', 'monitoring', 1, NULL, 'boolean'),
  ('pro', 'campaign_reports', 1, NULL, 'boolean');

-- Agency
INSERT OR IGNORE INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type) VALUES
  ('agency', 'drafts_versions', 1, NULL, 'boolean'),
  ('agency', 'canva', 1, NULL, 'boolean'),
  ('agency', 'adobe_express', 1, NULL, 'boolean'),
  ('agency', 'pexels', 1, NULL, 'boolean'),
  ('agency', 'scheduling', 1, NULL, 'boolean'),
  ('agency', 'monitoring', 1, NULL, 'boolean'),
  ('agency', 'campaign_reports', 1, NULL, 'boolean');

-- Dominance
INSERT OR IGNORE INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type) VALUES
  ('dominance', 'drafts_versions', 1, NULL, 'boolean'),
  ('dominance', 'canva', 1, NULL, 'boolean'),
  ('dominance', 'adobe_express', 1, NULL, 'boolean'),
  ('dominance', 'pexels', 1, NULL, 'boolean'),
  ('dominance', 'scheduling', 1, NULL, 'boolean'),
  ('dominance', 'monitoring', 1, NULL, 'boolean'),
  ('dominance', 'campaign_reports', 1, NULL, 'boolean');
