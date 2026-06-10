-- Storage Engine lock: schema drift repairs

CREATE TABLE IF NOT EXISTS brand_platforms (
  brand_id     TEXT NOT NULL,
  platform     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'not_selected',
  connected_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (brand_id, platform),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_brand_platforms_brand ON brand_platforms(brand_id);
