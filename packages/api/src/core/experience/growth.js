// packages/api/src/core/experience/growth.js
import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";

/**
 * GROWTH ENGINE — ANTI-ABUSE REINFORCED
 */

const POINT_VALUES = {
  publish_success: 50,
  approval_received: 20,
  campaign_completed: 100,
  seo_optimized: 15,
  report_generated: 10
};

/**
 * AWARD POINTS (INTERNAL ONLY)
 */
export async function awardPoints(db, { user_id, brand_id, action_type, content_id = null }) {
  const points = POINT_VALUES[action_type] || 0;
  if (points === 0) return;

  // Anti-Abuse: Limit points per content per day
  const existing = await db.prepare(`
    SELECT id FROM growth_activity_log 
    WHERE brand_id = ? AND action_type = ? AND content_id = ? AND created_at > date('now')
  `).bind(brand_id, action_type, content_id).first();

  if (existing) return; // Already awarded for this action on this content today

  await db.prepare(`
    INSERT INTO growth_activity_log (id, action_type, content_id, brand_id, user_id, points)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), action_type, content_id, brand_id, user_id, points).run();
}

/**
 * GET GROWTH SCORE
 */
export async function getGrowthScore(request, env, auth) {
  const db = getDB(env);
  const { brand_id } = auth;

  const stats = await db.prepare(`
    SELECT SUM(points) as total_points, COUNT(DISTINCT action_type) as variety_score
    FROM growth_activity_log
    WHERE brand_id = ?
  `).bind(brand_id).first();

  const streak = await db.prepare(`
    SELECT COUNT(DISTINCT date(created_at)) as active_days
    FROM growth_activity_log
    WHERE brand_id = ? AND created_at > date('now', '-30 days')
  `).bind(brand_id).first();

  return json({
    success: true,
    score: stats.total_points || 0,
    variety: stats.variety_score || 0,
    streak: streak.active_days || 0,
    tier: (stats.total_points || 0) > 1000 ? 'Pro' : (stats.total_points || 0) > 500 ? 'Growth' : 'Starter'
  });
}
