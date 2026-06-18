INSERT OR IGNORE INTO plan_features (key, name, description, category, visible) VALUES
('Unlimited_Social_Posts_&_Articles', 'Unlimited Social Posts & Articles', '', 'core', 1),
('AI_Content_Studio', 'AI Content Studio', '', 'core', 1),
('Content_Drafts_&_Versions', 'Content Drafts & Versions', '', 'core', 1),
('Canva_Integration', 'Canva Integration', '', 'core', 1),
('Adobe_Express_Integration', 'Adobe Express Integration', '', 'core', 1),
('Free_Image_Library_(Pexels)', 'Free Image Library (Pexels)', '', 'core', 1),
('Multi-Platform_Publishing', 'Multi-Platform Publishing', '', 'core', 1),
('Content_Scheduling', 'Content Scheduling', '', 'core', 1),
('Publishing_Monitoring', 'Publishing Monitoring', '', 'core', 1),
('Team_Collaboration', 'Team Collaboration', '', 'core', 1),
('Approvals_&_Reviews', 'Approvals & Reviews', '', 'core', 1),
('Multi-Brand_Access', 'Multi-Brand Access', '', 'core', 1),
('Analytics_&_Reporting', 'Analytics & Reporting', '', 'core', 1),
('SEO_Center', 'SEO Center', '', 'core', 1),
('Campaign_Reporting', 'Campaign Reporting', '', 'core', 1),
('Brand_Intelligence', 'Brand Intelligence', '', 'core', 1);

DELETE FROM plan_entitlements WHERE plan_id = 'dominance';

INSERT INTO plan_entitlements (plan_id, feature_key, enabled, limit_type) VALUES
('dominance', 'Unlimited_Social_Posts_&_Articles', 1, 'boolean'),
('dominance', 'AI_Content_Studio', 1, 'boolean'),
('dominance', 'Content_Drafts_&_Versions', 1, 'boolean'),
('dominance', 'Canva_Integration', 1, 'boolean'),
('dominance', 'Adobe_Express_Integration', 1, 'boolean'),
('dominance', 'Free_Image_Library_(Pexels)', 1, 'boolean'),
('dominance', 'Multi-Platform_Publishing', 1, 'boolean'),
('dominance', 'Content_Scheduling', 1, 'boolean'),
('dominance', 'Publishing_Monitoring', 1, 'boolean'),
('dominance', 'Team_Collaboration', 1, 'boolean'),
('dominance', 'Approvals_&_Reviews', 1, 'boolean'),
('dominance', 'Multi-Brand_Access', 1, 'boolean'),
('dominance', 'Analytics_&_Reporting', 1, 'boolean'),
('dominance', 'SEO_Center', 1, 'boolean'),
('dominance', 'Campaign_Reporting', 1, 'boolean'),
('dominance', 'Brand_Intelligence', 1, 'boolean');
