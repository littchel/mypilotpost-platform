DROP TABLE IF EXISTS media_assets;

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,

  source TEXT NOT NULL, -- canva | google_drive | dropbox | upload
  source_ref TEXT,      -- provider file ID

  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,

  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,

  r2_key TEXT NOT NULL,
  preview_url TEXT,

  status TEXT NOT NULL DEFAULT 'ready',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_brand
  ON media_assets (brand_id);

CREATE INDEX IF NOT EXISTS idx_media_customer
  ON media_assets (customer_id);
