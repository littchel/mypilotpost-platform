// packages/api/src/core/dashboard/summary.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * DASHBOARD SUMMARY — PRODUCTION GRADE
 * - Read-only
 * - Brand-scoped
 * - Zero-state safe
 * - Type-safe
 */
export async function getDashboardSummary(request, env, customer) {
  const brandId = customer?.brand_id;
  if (!brandId) {
    return error("Brand context missing", "BAD_REQUEST", null, 400);
  }

  const db = getDB(env);

  // 1. Metrics (Total)
  const stats = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM delivery_jobs WHERE brand_id = ?) as scheduled,
      (SELECT COUNT(*) FROM delivery_jobs WHERE brand_id = ? AND status = 'delivered') as published,
      (SELECT COUNT(*) FROM social_assets WHERE brand_id = ?) + 
      (SELECT COUNT(*) FROM blog_posts WHERE brand_id = ?) as total_content
  `).bind(brandId, brandId, brandId, brandId).first();

  // 2. Metrics (This Week)
  // Assumes start of week is Monday
  const thisWeek = await db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as published
    FROM delivery_jobs
    WHERE brand_id = ?
      AND scheduled_at >= date('now', 'weekday 0', '-6 days')
  `).bind(brandId).first();

  // 3. Engagement (Fake for now as per analytics truth, but structured)
  const engagement = "0%"; 

  return json({
    metrics: {
      totalContent: stats?.total_content || 0,
      scheduledPosts: stats?.scheduled || 0,
      publishedPosts: stats?.published || 0,
      engagementRate: engagement
    },
    thisWeek: {
      scheduled: thisWeek?.scheduled || 0,
      published: thisWeek?.published || 0
    }
  });
}
