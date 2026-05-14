import { getDB } from "../../lib/db.js";
import { writeBrandMemoryEvent } from "../brands/memory-writer.js";

/**
 * Allowed metric types (LOCKED)
 */
const ALLOWED_METRICS = new Set([
  "impression",
  "click",
  "like",
  "comment",
  "share",
  "save",
]);

/**
 * Ingest engagement metrics reported by platforms.
 *
 * Rules:
 * - Platform-reported only
 * - Append-only
 * - No normalization
 * - No scoring
 * - No aggregation
 */
export async function recordEngagementMetrics(env, payload) {
  const db = getDB(env);

  const {
    content_id,
    campaign_id, // optional but required to emit outcomes
    platform,
    metrics,
    reported_at,
  } = payload;

  if (!content_id || !platform || !Array.isArray(metrics)) {
    throw new Error("Invalid engagement metrics payload");
  }

  const reportedAt = reported_at || new Date().toISOString();

  for (const metric of metrics) {
    const { type, value } = metric;

    if (!ALLOWED_METRICS.has(type)) {
      throw new Error(`Unsupported metric type: ${type}`);
    }

    const metricId = crypto.randomUUID();

    /* 1. Persist raw engagement metric (append-only) */
    await db
      .prepare(
        `
        INSERT INTO content_engagement_metrics (
          id,
          content_id,
          platform,
          metric_type,
          value,
          reported_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        metricId,
        content_id,
        platform,
        type,
        value,
        reportedAt
      )
      .run();

    /* 2. Emit campaign outcome (write-only, if campaign exists) */
    if (campaign_id && (type === "impression" || type === "click")) {
      await emitCampaignOutcome(db, {
        campaign_id,
        content_id,
        platform,
        type,
        value,
        occurred_at: reportedAt,
      });
    }
  }
}

/**
 * Emit campaign outcomes
 *
 * IMPORTANT:
 * - Distribution writes only
 * - No ROI, no objectives, no spend
 * - Pure fact emission
 */
async function emitCampaignOutcome(db, outcome) {
  const {
    campaign_id,
    content_id,
    platform,
    type,
    value,
    occurred_at,
  } = outcome;

  await db
    .prepare(
      `
      INSERT INTO campaign_outcomes (
        id,
        campaign_id,
        content_id,
        platform,
        outcome_type,
        value,
        occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      crypto.randomUUID(),
      campaign_id,
      content_id,
      platform,
      type,
      value,
      occurred_at
    )
    .run();
}

/**
 * FINALIZE CONTENT PERFORMANCE WINDOW
 *
 * This function MUST be called explicitly by a scheduler or job.
 * It is the ONLY place where Brand Memory is written for analytics.
 *
 * Rules:
 * - One call per content + platform + window
 * - Reads existing metrics
 * - Writes ONE immutable memory event
 */
export async function finalizeContentPerformanceWindow(env, {
  brand_id,
  content_id,
  content_type,
  platform,
  window_days = 7
}) {
  const db = getDB(env);

  /* Aggregate metrics for the window */
  const rows = await db
    .prepare(
      `
      SELECT
        metric_type,
        SUM(value) AS total
      FROM content_engagement_metrics
      WHERE content_id = ?
        AND platform = ?
        AND reported_at >= datetime('now', ?)
      GROUP BY metric_type
      `
    )
    .bind(
      content_id,
      platform,
      `-${window_days} days`
    )
    .all();

  const totals = {
    impressions: 0,
    clicks: 0,
    engagement: 0,
  };

  for (const row of rows.results) {
    if (row.metric_type === "impression") {
      totals.impressions = row.total;
    }
    if (row.metric_type === "click") {
      totals.clicks = row.total;
    }
    if (
      row.metric_type === "like" ||
      row.metric_type === "comment" ||
      row.metric_type === "share" ||
      row.metric_type === "save"
    ) {
      totals.engagement += row.total;
    }
  }

  const success = totals.impressions > 0;

  /* 🔐 Brand Memory: content performed (FINAL WINDOW) */
  await writeBrandMemoryEvent(db, {
    brandId: brand_id,
    eventType: "content_performed",
    sourceEngine: "analytics",
    entityType: content_type,
    entityId: content_id,
    snapshot: {
      platform,
      impressions: totals.impressions,
      engagement: totals.engagement,
      clicks: totals.clicks,
      success,
      window_days
    }
  });
}
