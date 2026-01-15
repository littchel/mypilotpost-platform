-- ============================================================
-- ML Training Data Extraction
-- Canonical, deterministic, rebuildable
-- READ-ONLY
-- Used by: /packages/ml/training/feature_builder.py
-- ============================================================

-- PARAMETERS (bound by the caller)
-- :brand_id            TEXT
-- :cutoff_date         TEXT (ISO timestamp)
-- :window_days         INTEGER (e.g. 30, 90)

WITH training_window AS (
  SELECT
    :brand_id AS brand_id,
    datetime(:cutoff_date) AS cutoff_date,
    date(datetime(:cutoff_date), '-' || :window_days || ' days') AS window_start
),

-- ------------------------------------------------------------
-- Brand Context (slow-changing)
-- ------------------------------------------------------------
brand_context AS (
  SELECT
    c.brand_id,
    c.industry                AS brand_industry,
    c.plan                    AS plan_tier,

    AVG(u.total)              AS avg_total_usage,
    AVG(u.delivered)          AS avg_delivered_usage,

    CASE
      WHEN AVG(u.total) = 0 THEN 0
      ELSE AVG(u.delivered) * 1.0 / AVG(u.total)
    END                       AS delivery_success_ratio

  FROM customers c
  LEFT JOIN usage_metrics u
    ON u.customer_id = c.brand_id

  WHERE c.brand_id = :brand_id
),

-- ------------------------------------------------------------
-- Content Structure Features (pre-performance)
-- ------------------------------------------------------------
content_features AS (
  SELECT
    p.id                      AS content_id,
    p.brand_id,
    p.platform,
    p.format,
    p.locale,

    p.word_count,
    p.media_count,
    p.hashtag_count,

    LENGTH(p.body)            AS char_count,

    CAST(strftime('%H', p.published_at) AS INTEGER)
                              AS publish_hour,
    CAST(strftime('%w', p.published_at) AS INTEGER)
                              AS publish_day_of_week

  FROM social_posts p
  JOIN training_window tw
    ON p.brand_id = tw.brand_id
   AND p.published_at >= tw.window_start
   AND p.published_at <  tw.cutoff_date
),

-- ------------------------------------------------------------
-- Delivery & Reliability Signals
-- ------------------------------------------------------------
delivery_features AS (
  SELECT
    d.content_id,

    COUNT(*)                  AS delivery_attempts,
    SUM(CASE WHEN d.success = 1 THEN 1 ELSE 0 END)
                              AS successful_deliveries,
    AVG(d.retry_count)        AS avg_retry_count,

    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE SUM(CASE WHEN d.success = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*)
    END                       AS delivery_success_rate

  FROM delivery_logs d
  JOIN training_window tw
    ON d.brand_id = tw.brand_id
   AND d.created_at >= tw.window_start
   AND d.created_at <  tw.cutoff_date

  GROUP BY d.content_id
),

-- ------------------------------------------------------------
-- SEO Signals (lagging, contextual)
-- ------------------------------------------------------------
seo_features AS (
  SELECT
    r.content_id,

    AVG(r.rank_position)      AS avg_rank_position,
    AVG(r.rank_change)        AS avg_rank_change,
    COUNT(a.issue_id)         AS audit_issue_count

  FROM seo_rank_history r
  LEFT JOIN seo_audits a
    ON a.content_id = r.content_id

  JOIN training_window tw
    ON r.brand_id = tw.brand_id
   AND r.recorded_at >= tw.window_start
   AND r.recorded_at <  tw.cutoff_date

  GROUP BY r.content_id
),

-- ------------------------------------------------------------
-- Performance Labels (GROUND TRUTH — training only)
-- ------------------------------------------------------------
performance_labels AS (
  SELECT
    e.content_id,

    AVG(e.engagement_score)   AS engagement_label,
    AVG(e.clicks)             AS clicks_label

  FROM engagement_metrics e
  JOIN training_window tw
    ON e.brand_id = tw.brand_id
   AND e.recorded_at >= tw.window_start
   AND e.recorded_at <  tw.cutoff_date

  GROUP BY e.content_id
)

-- ------------------------------------------------------------
-- FINAL FLAT TRAINING DATASET
-- ------------------------------------------------------------
SELECT
  cf.*,

  bc.brand_industry,
  bc.plan_tier,
  bc.delivery_success_ratio,

  df.delivery_attempts,
  df.successful_deliveries,
  df.avg_retry_count,
  df.delivery_success_rate,

  sf.avg_rank_position,
  sf.avg_rank_change,
  sf.audit_issue_count,

  pl.engagement_label,
  pl.clicks_label

FROM content_features cf
LEFT JOIN brand_context bc
  ON cf.brand_id = bc.brand_id
LEFT JOIN delivery_features df
  ON cf.content_id = df.content_id
LEFT JOIN seo_features sf
  ON cf.content_id = sf.content_id
LEFT JOIN performance_labels pl
  ON cf.content_id = pl.content_id;
