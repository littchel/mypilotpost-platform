-- Phase D — External ID Type
-- Generalizes delivery_jobs.external_post_id to support multiple external ID types.
-- Enables Canva design IDs, media asset IDs, etc. alongside platform post IDs.
-- Default 'platform_post' preserves semantics of all existing rows.

ALTER TABLE delivery_jobs ADD COLUMN external_id_type TEXT NOT NULL DEFAULT 'platform_post';

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_ext_id_type
  ON delivery_jobs(external_id_type, platform)
  WHERE external_post_id IS NOT NULL;
