-- Phase D — Attribution Recovery
-- Restores the full Campaign → Content → Delivery → Analytics chain.
--
-- Root cause: delivery_jobs is missing updated_at, external_post_id, campaign_id.
-- The absence of updated_at causes every delivery attempt to throw on the lock
-- acquisition UPDATE, leaving delivery_jobs perpetually empty and breaking the
-- entire publishing, analytics, and attribution stack.
--
-- campaign_outcomes is also missing content_id, platform, outcome_type, occurred_at
-- (code writes them; schema didn't have them — every outcome emit was a SQL error).

-- -----------------------------------------------------------------------
-- 1. Restore delivery_jobs missing columns
-- -----------------------------------------------------------------------
ALTER TABLE delivery_jobs ADD COLUMN updated_at TEXT;
ALTER TABLE delivery_jobs ADD COLUMN external_post_id TEXT;
ALTER TABLE delivery_jobs ADD COLUMN campaign_id TEXT;

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_campaign
  ON delivery_jobs(campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_external_post_id
  ON delivery_jobs(external_post_id)
  WHERE external_post_id IS NOT NULL;

-- -----------------------------------------------------------------------
-- 2. Backfill campaign_id for any existing delivery_jobs records
--    Primary path: social_assets.campaign_id via content_id
-- -----------------------------------------------------------------------
UPDATE delivery_jobs
SET campaign_id = (
  SELECT sa.campaign_id
  FROM social_assets sa
  WHERE sa.id = delivery_jobs.content_id
    AND sa.campaign_id IS NOT NULL
  LIMIT 1
)
WHERE campaign_id IS NULL;

-- Secondary path: blog_posts.campaign_id
UPDATE delivery_jobs
SET campaign_id = (
  SELECT bp.campaign_id
  FROM blog_posts bp
  WHERE bp.id = delivery_jobs.content_id
    AND bp.campaign_id IS NOT NULL
  LIMIT 1
)
WHERE campaign_id IS NULL;

-- Tertiary path: campaign_content_links join table
UPDATE delivery_jobs
SET campaign_id = (
  SELECT ccl.campaign_id
  FROM campaign_content_links ccl
  WHERE ccl.content_id = delivery_jobs.content_id
  LIMIT 1
)
WHERE campaign_id IS NULL;

-- -----------------------------------------------------------------------
-- 3. Fix campaign_outcomes — add missing columns
--    Code (metrics.js) inserts content_id, platform, outcome_type, occurred_at
--    Live schema only had: id, campaign_id, metric, value, source, observed_at
-- -----------------------------------------------------------------------
ALTER TABLE campaign_outcomes ADD COLUMN content_id TEXT;
ALTER TABLE campaign_outcomes ADD COLUMN platform TEXT;
ALTER TABLE campaign_outcomes ADD COLUMN outcome_type TEXT;
ALTER TABLE campaign_outcomes ADD COLUMN occurred_at TEXT;

CREATE INDEX IF NOT EXISTS idx_campaign_outcomes_content
  ON campaign_outcomes(content_id)
  WHERE content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_outcomes_platform
  ON campaign_outcomes(campaign_id, platform)
  WHERE platform IS NOT NULL;
