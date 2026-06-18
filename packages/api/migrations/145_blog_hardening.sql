-- Migration 145: Blog Hardening & Category Support

CREATE TABLE IF NOT EXISTS blog_categories (
  category_id   TEXT PRIMARY KEY,
  category_slug TEXT UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed default categories
INSERT OR IGNORE INTO blog_categories (category_id, category_slug, category_name) VALUES
('cat_business', 'business', 'Business'),
('cat_marketing', 'marketing', 'Marketing'),
('cat_social_media', 'social-media', 'Social Media'),
('cat_seo', 'seo', 'SEO'),
('cat_content_strategy', 'content-strategy', 'Content Strategy'),
('cat_platform_updates', 'platform-updates', 'Platform Updates'),
('cat_case_studies', 'case-studies', 'Case Studies'),
('cat_news', 'news', 'News'),
('cat_announcements', 'announcements', 'Announcements'),
('cat_guides', 'guides', 'Guides');

-- Alter marketing_blog_posts schema to include new properties
ALTER TABLE marketing_blog_posts ADD COLUMN category_id TEXT;
ALTER TABLE marketing_blog_posts ADD COLUMN cover_image TEXT;
ALTER TABLE marketing_blog_posts ADD COLUMN seo_title TEXT;
ALTER TABLE marketing_blog_posts ADD COLUMN seo_description TEXT;
ALTER TABLE marketing_blog_posts ADD COLUMN tags TEXT;
