-- Resource Selection for Social Connections
-- Adds selected resource columns and migration state for platforms
-- that require post-OAuth resource picking (Google Analytics, GSC,
-- Google Business, LinkedIn).

ALTER TABLE social_connections ADD COLUMN selected_resource_id   TEXT;
ALTER TABLE social_connections ADD COLUMN selected_resource_name TEXT;
ALTER TABLE social_connections ADD COLUMN resource_type          TEXT;

-- Mark all existing active connections for these platforms as needing
-- resource selection. They have tokens but no pinned property/page/location.
UPDATE social_connections
SET    status = 'CONNECTED_NEEDS_RESOURCE'
WHERE  platform IN ('google_analytics', 'google_search_console', 'google_business', 'linkedin')
  AND  status   = 'active'
  AND  selected_resource_id IS NULL;
