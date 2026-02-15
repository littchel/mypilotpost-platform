// packages/api/src/api/admin/analytics.js

import { getDB } from "../../lib/db.js";
import { json } from "../../lib/json.js";

/**
 * GET /api/health
 *
 * Platform liveness check.
 * Used by Cloudflare, uptime monitors, and CI.
 */
export async function healthCheck() {
  return json({
    status: "ok",
    service: "mypilotpost-api",
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/admin/analytics/delivery
 *
 * Read-only delivery analytics.
 * Answers: "Did the system work?"
 */
export async function deliveryAnalytics(env) {
  const db = getDB(env);

  /* ============================
     1. Delivery counts
  ============================ */
  const deliveryStats = await db
    .prepare(`
      SELECT
        COUNT(*) AS total_jobs,
        SUM(CASE WHEN state = 'delivered' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM content_delivery_jobs
    `)
    .first();

  const total = deliveryStats?.total_jobs ?? 0;
  const delivered = deliveryStats?.delivered ?? 0;
  const failed = deliveryStats?.failed ?? 0;

  /* ============================
     2. Retry stats
  ============================ */
  const retryStats = await db
    .prepare(`
      SELECT
        COUNT(*) AS total_attempts,
        COUNT(DISTINCT job_id) AS jobs_with_attempts
      FROM content_delivery_attempts
    `)
    .first();

  /* ============================
     3. Platform reliability
  ============================ */
  const platformReliability = await db
    .prepare(`
      SELECT
        platform,
        COUNT(*) AS total,
        SUM(CASE WHEN state = 'delivered' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM content_delivery_jobs
      GROUP BY platform
    `)
    .all();

  /* ============================
     4. Engagement volume
  ============================ */
  const engagementVolume = await db
    .prepare(`
      SELECT
        metric_type,
        SUM(value) AS total
      FROM content_engagement_metrics
      GROUP BY metric_type
    `)
    .all();

  return json({
    total_jobs: total,
    delivered,
    failed,
    success_rate: total > 0 ? delivered / total : 0,
    failure_rate: total > 0 ? failed / total : 0,

    retry_stats: {
      total_attempts: retryStats?.total_attempts ?? 0,
      jobs_with_attempts: retryStats?.jobs_with_attempts ?? 0,
    },

    platform_reliability: platformReliability?.results ?? [],
    engagement_volume: engagementVolume?.results ?? [],
  });
}
