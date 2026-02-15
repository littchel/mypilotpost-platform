// packages/api/src/core/intelligence/intelligence.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * BRAND INTELLIGENCE — READ ONLY (PHASE 2B)
 *
 * PURPOSE:
 * - Expose accumulated brand signals
 * - Explain past behavior
 * - No prediction, no automation
 *
 * SOURCE OF TRUTH:
 * - brand_memory_events
 * - delivery_attempts
 *
 * LOCKED:
 * - No ML
 * - No scoring magic
 * - Fully explainable
 */
export async function getBrandIntelligence(env, auth) {
  if (!auth?.brand_id) {
    return error("Unauthorized", 401);
  }

  const db = getDB(env);
  const brandId = auth.brand_id;

  /* --------------------------------------------------
     Engagement score (simple, explainable heuristic)
     NOTE: This is NOT predictive
  -------------------------------------------------- */
  const attempts = await db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS success
      FROM delivery_attempts
      WHERE brand_id = ?
      `
    )
    .bind(brandId)
    .first();

  const total = attempts?.total || 0;
  const success = attempts?.success || 0;

  const engagementScore =
    total === 0 ? 0 : Math.round((success / total) * 100);

  /* --------------------------------------------------
     Recent memory signals (what happened)
  -------------------------------------------------- */
  const memory = await db
    .prepare(
      `
      SELECT
        type,
        message,
        severity,
        created_at
      FROM brand_memory_events
      WHERE brand_id = ?
      ORDER BY created_at DESC
      LIMIT 10
      `
    )
    .bind(brandId)
    .all();

  /* --------------------------------------------------
     Recommendations (RULE-BASED, EXPLAINABLE)
     These are NOT ML predictions
  -------------------------------------------------- */
  const recommendations = [];

  if (total > 0 && success / total < 0.5) {
    recommendations.push({
      type: "delivery_health",
      message:
        "Delivery success rate is below 50%. Review scheduling times or platforms.",
    });
  }

  if (total === 0) {
    recommendations.push({
      type: "activation",
      message:
        "No deliveries yet. Schedule your first post to unlock performance insights.",
    });
  }

  return json({
    brand_id: brandId,
    engagement_score: engagementScore,
    signals: memory.results || [],
    recommendations,
  });
}
