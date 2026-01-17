-- =========================================
-- Milestone 7: Admin Analytics & Observability
-- Migration: 012_admin_observability.sql
-- =========================================

-- Delivery reliability metrics (daily)
CREATE TABLE IF NOT EXISTS admin_delivery_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL, -- YYYY-MM-DD (UTC)
  scheduled INTEGER DEFAULT 0,
  delivered INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  avg_latency_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

-- Content throughput metrics
CREATE TABLE IF NOT EXISTS admin_content_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  social_created INTEGER DEFAULT 0,
  blog_created INTEGER DEFAULT 0,
  published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

-- Platform health events (append-only)
CREATE TABLE IF NOT EXISTS admin_system_events (
  id TEXT PRIMARY KEY,
  severity TEXT NOT NULL,   -- info | warning | critical
  source TEXT NOT NULL,     -- scheduler | poster | billing | auth
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_events_severity
ON admin_system_events(severity);

CREATE INDEX IF NOT EXISTS idx_admin_events_source
ON admin_system_events(source);
