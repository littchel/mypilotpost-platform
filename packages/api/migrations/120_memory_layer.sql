-- myPilotPost — Platform Memory Layer
-- Four tables: raw events → features → brand memory → snapshots
-- Retention: events 18m, features 24m, memory indefinite, snapshots 36m

-- ── Raw event stream ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_events (
  id          TEXT PRIMARY KEY,
  brand_id    TEXT,
  user_id     TEXT,
  tool        TEXT NOT NULL,   -- ai_studio | create_post | scheduler | reports | …
  event       TEXT NOT NULL,   -- content_created | content_published | approval_completed | …
  value       REAL,            -- optional numeric value (e.g. score, count)
  metadata    TEXT,            -- JSON
  created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mevt_brand   ON memory_events(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mevt_tool    ON memory_events(tool, event);
CREATE INDEX IF NOT EXISTS idx_mevt_event   ON memory_events(event, created_at DESC);

-- ── Aggregated features ──────────────────────────────────────────────────────
-- One row per (brand_id, feature, window). Upserted on event consume.
CREATE TABLE IF NOT EXISTS memory_features (
  id          TEXT PRIMARY KEY,
  brand_id    TEXT NOT NULL,
  feature     TEXT NOT NULL,   -- publishing_frequency | approval_rate | report_usage | …
  value       TEXT NOT NULL,   -- JSON: number, array, or object
  window      TEXT NOT NULL,   -- all_time | 7d | 30d | 90d
  computed_at DATETIME NOT NULL DEFAULT (datetime('now')),
  UNIQUE(brand_id, feature, window)
);

CREATE INDEX IF NOT EXISTS idx_mfeat_brand ON memory_features(brand_id, feature);

-- ── Brand memory (key-value intelligence store) ──────────────────────────────
CREATE TABLE IF NOT EXISTS brand_memory (
  id          TEXT PRIMARY KEY,
  brand_id    TEXT NOT NULL,
  namespace   TEXT NOT NULL,   -- brand | content | campaign | report | customer | scheduler | media
  key         TEXT NOT NULL,   -- preferred_platform | posting_pattern | top_content_type | …
  value       TEXT NOT NULL,   -- JSON
  confidence  REAL NOT NULL DEFAULT 0.5,  -- 0–1 derived from sample size
  source      TEXT,            -- feature or event that produced this
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  UNIQUE(brand_id, namespace, key)
);

CREATE INDEX IF NOT EXISTS idx_bmem_brand ON brand_memory(brand_id, namespace);

-- ── Periodic snapshots ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_snapshots (
  id            TEXT PRIMARY KEY,
  brand_id      TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,   -- YYYY-MM-DD
  period        TEXT NOT NULL DEFAULT 'daily',  -- daily | weekly | monthly
  payload       TEXT NOT NULL,   -- JSON: { features, memory, event_counts }
  created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
  UNIQUE(brand_id, snapshot_date, period)
);

CREATE INDEX IF NOT EXISTS idx_msnap_brand ON memory_snapshots(brand_id, snapshot_date DESC);
