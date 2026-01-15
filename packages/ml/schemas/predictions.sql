-- ============================================================
-- ML Inference Input Dataset
-- Used for generating predictions (NOT training)
-- READ-ONLY
-- ============================================================

-- PARAMETERS
-- :brand_id      TEXT
-- :as_of_date    TEXT (ISO timestamp)
-- :window_days   INTEGER

WITH inference_window AS (
  SELECT
    :brand_id AS brand_id,
    datetime(:as_of_date) AS as_of_date,
    date(datetime(:as_of_date), '-' || :window_days || ' days') AS window_start
),

-- ------------------------------------------------------------
-- Brand Context (same shape as training)
-- ------------------------------------------------------------
brand_context AS (
  SELECT
    c.brand_id,
    c.industry            AS brand_industry,
    c.plan                AS plan_tier,

    AVG(u.total)          AS avg_total_usage,
    AVG(u.delivered)      AS avg_delivered_usage,

    CASE
      WHEN AVG(u.total) = 0 THEN 0
      ELSE AVG(u.delivered) * 1.0 / AVG(u.total)
    END                   AS delivery_success_ratio

  FROM customers c
  LEFT JOIN usage_metrics u
    ON u.customer_id = c.brand_id

  WHERE c.brand_id = :brand_id
),

-- ------------------------------------------------------------
-- Content Candidates (NO labels)
-- ------------------------------------------------------------
content_features AS (
  SELECT
    p.id                  AS content_id,
    p.brand_id,
    p.platform,
    p.format,
    p.locale,

    p.word_count,
    p.media_count,
    p.hashtag_count,
    LENGTH(p.body)        AS char_count,

    CAST(strftime('%H', p.scheduled_at) AS INTEGER)
                          AS publish_hour,
    CAST(strftime('%w', p.scheduled_at) AS INTEGER)
                          AS publish_day_of_week

  FROM social_posts p
  JOIN inference_window iw
    ON p.brand_id = iw.brand_id
   AND p.scheduled_at >= iw.window_start
   AND p.scheduled_at <  iw.as_of_date
),

-- ------------------------------------------------------------
-- Recent Delivery Context
-- ------------------------------------------------------------
delivery_context AS (
  SELECT
    d.content_id,
    AVG(d.retry_count)    AS avg_retry_count,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE SUM(CASE WHEN d.success = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*)
    END                   AS delivery_success_rate

  FROM delivery_logs d
  JOIN inference_window iw
    ON d.brand_id = iw.brand_id
   AND d.created_at >= iw.window_start
   AND d.created_at <  iw.as_of_date

  GROUP BY d.content_id
)

-- ------------------------------------------------------------
-- FINAL INFERENCE DATASET
-- ------------------------------------------------------------
SELECT
  cf.*,

  bc.brand_industry,
  bc.plan_tier,
  bc.delivery_success_ratio,

  dc.avg_retry_count,
  dc.delivery_success_rate

FROM content_features cf
LEFT JOIN brand_context bc
  ON cf.brand_id = bc.brand_id
LEFT JOIN delivery_context dc
  ON cf.content_id = dc.content_id;
