// packages/api/src/core/delivery/execute.js

import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";

/**
 * GET /api/customer/delivery/stats
 * Per-brand delivery success rate, retry counts, and failure breakdown by platform.
 */
export async function getDeliveryStats(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const db = getDB(env);

  const { results: byPlatform } = await db.prepare(`
    SELECT
      platform,
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN status = 'failed'    THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN status = 'processing' OR status = 'scheduled' THEN 1 ELSE 0 END) AS pending,
      SUM(delivery_attempts) AS total_attempts
    FROM delivery_jobs
    WHERE brand_id = ?
    GROUP BY platform
  `).bind(auth.brand_id).all();

  const summary = (byPlatform || []).reduce(
    (acc, r) => {
      acc.total      += r.total;
      acc.published  += r.published;
      acc.failed     += r.failed;
      acc.pending    += r.pending;
      return acc;
    },
    { total: 0, published: 0, failed: 0, pending: 0 }
  );

  summary.success_rate = summary.total
    ? Math.round((summary.published / summary.total) * 100)
    : 0;

  return json({
    summary,
    by_platform: (byPlatform || []).map(r => ({
      platform: r.platform,
      total: r.total,
      published: r.published,
      failed: r.failed,
      pending: r.pending,
      success_rate: r.total ? Math.round((r.published / r.total) * 100) : 0,
      avg_attempts: r.total ? Math.round((r.total_attempts / r.total) * 10) / 10 : 0,
    })),
  });
}
