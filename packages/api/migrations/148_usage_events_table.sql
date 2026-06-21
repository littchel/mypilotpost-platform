-- Migration: 148_usage_events_table.sql
-- Description: Create usage_events table for tracking AI usage and events

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_type TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  user_id TEXT,
  content_id TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_events_brand ON usage_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_events_created ON usage_events(created_at);
