import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/customer/analytics/summary
 */
export async function getAnalyticsSummary(request, env) {
  const db = getDB(env);
  const url = new URL(request.url);
  const brand_id = url.searchParams.get("brand_id");

  if (!brand_id) {
    return json({ error: "brand_id is required" }, 400);
  }

  const totals = await db.prepare(`
    SELECT
      SUM(impressions) as impressions,
      SUM(engagements) as engagements,
      SUM(clicks) as clicks
    FROM content_analytics
    WHERE brand_id = ?
  `)
    .bind(brand_id)
    .first();

  const topContent = await db.prepare(`
    SELECT
      content_type,
      content_id,
      impressions,
      engagements,
      clicks
    FROM content_analytics
    WHERE brand_id = ?
    ORDER BY engagements DESC
    LIMIT 5
  `)
    .bind(brand_id)
    .all();

  return json({
    summary: {
      impressions: totals?.impressions || 0,
      engagements: totals?.engagements || 0,
      clicks: totals?.clicks || 0,
    },
    top_content: topContent.results,
  });
}

/**
 * GET /api/customer/analytics/content/:id
 */
export async function getContentAnalytics(request, env, contentId) {
  const db = getDB(env);

  const analytics = await db.prepare(`
    SELECT *
    FROM content_analytics
    WHERE content_id = ?
  `)
    .bind(contentId)
    .first();

  if (!analytics) {
    return json({ error: "Analytics not found" }, 404);
  }

  return json({ analytics });
}
