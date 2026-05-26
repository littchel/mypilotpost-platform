-- Marketing blog posts table (public-facing, managed by admin)
CREATE TABLE IF NOT EXISTS marketing_blog_posts (
  id           TEXT PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  excerpt      TEXT,
  content_html TEXT NOT NULL DEFAULT '',
  featured_image TEXT,
  category     TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  author       TEXT DEFAULT 'myPilotPost Team',
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_blog_status_published
  ON marketing_blog_posts (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_blog_slug
  ON marketing_blog_posts (slug);
