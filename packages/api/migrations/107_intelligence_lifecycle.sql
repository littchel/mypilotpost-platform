-- Intelligence Lifecycle System
-- Tracks the full lifecycle of each intelligence item:
-- new → unread → acknowledged | resolved | expired → archived
--
-- Dashboard impression schedule (from first_shown_at):
--   Impression 1: immediately (login / session start)
--   Impression 2: first_shown_at + 20 minutes
--   Impression 3: first_shown_at + 50 minutes
--   Impression 4: first_shown_at + 3 hours (final reminder)
--   After 4 impressions: lifecycle_status = 'expired', no more dashboard visibility

ALTER TABLE brand_intelligence_queue ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE brand_intelligence_queue ADD COLUMN dashboard_impression_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE brand_intelligence_queue ADD COLUMN first_shown_at TEXT;
ALTER TABLE brand_intelligence_queue ADD COLUMN last_shown_at TEXT;
ALTER TABLE brand_intelligence_queue ADD COLUMN acknowledged_at TEXT;
ALTER TABLE brand_intelligence_queue ADD COLUMN resolved_at TEXT;
ALTER TABLE brand_intelligence_queue ADD COLUMN dashboard_expires_at TEXT;
ALTER TABLE brand_intelligence_queue ADD COLUMN next_dashboard_show_at TEXT;

-- Fast lookup for dashboard-eligible items
CREATE INDEX IF NOT EXISTS idx_biq_lifecycle
  ON brand_intelligence_queue(brand_id, lifecycle_status, next_dashboard_show_at);

CREATE INDEX IF NOT EXISTS idx_biq_dashboard_eligible
  ON brand_intelligence_queue(brand_id, is_notification, dismissed_at, dashboard_impression_count, next_dashboard_show_at);
