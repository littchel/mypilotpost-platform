-- Performance Snapshots
-- Stores raw platform metrics fetched after each published post.
-- Written by: packages/api/src/core/delivery/performance/engine.js

CREATE TABLE IF NOT EXISTS performance_snapshots (
  id              TEXT PRIMARY KEY,
  brand_id        TEXT NOT NULL,
  content_id      TEXT NOT NULL,
  platform        TEXT NOT NULL,
  external_post_id TEXT NOT NULL,
  metrics_json    TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'api',
  captured_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_perf_snapshots_brand    ON performance_snapshots(brand_id);
CREATE INDEX IF NOT EXISTS idx_perf_snapshots_content  ON performance_snapshots(content_id);
CREATE INDEX IF NOT EXISTS idx_perf_snapshots_platform ON performance_snapshots(platform, captured_at DESC);
