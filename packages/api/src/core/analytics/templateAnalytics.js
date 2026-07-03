/**
 * myPilotPost — Template Analytics Engine
 * Tracks template engagement metrics (impressions, engagements, clicks, CTR)
 * and feeds Bayesian Multi-Armed Bandit (MAB) ranking priorities.
 */

/**
 * Recalculate engagement rate safely
 */
function calculateEngagementRate(impressions, engagements) {
  if (!impressions || impressions <= 0) return 0.0;
  const rate = (engagements / impressions) * 100;
  return Math.round(rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Initialize template performance record with 0 metrics if not already present.
 */
export async function initializeTemplateTracking(db, { brand_id, template_id, platform }) {
  if (!brand_id || !template_id || !platform) return null;

  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT OR IGNORE INTO template_performance
        (id, brand_id, template_id, platform, impressions, engagements, clicks, engagement_rate, last_updated)
      VALUES (?, ?, ?, ?, 0, 0, 0, 0.0, datetime('now'))
    `).bind(id, brand_id, template_id, platform.toLowerCase()).run();
    return true;
  } catch (err) {
    console.error("[TEMPLATE ANALYTICS] Failed to initialize tracking", err);
    return false;
  }
}

/**
 * Accumulate performance metrics for a specific template.
 * Updates impressions, engagements, and clicks, then recalculates engagement rate.
 */
export async function recordTemplateMetrics(db, {
  brand_id,
  template_id,
  platform,
  impressions = 0,
  engagements = 0,
  clicks = 0
}) {
  if (!brand_id || !template_id || !platform) return false;

  const normalizedPlatform = platform.toLowerCase();

  try {
    // 1. Fetch current metrics to calculate new totals and rates accurately
    const current = await db.prepare(`
      SELECT impressions, engagements, clicks
      FROM template_performance
      WHERE brand_id = ? AND template_id = ? AND platform = ?
    `).bind(brand_id, template_id, normalizedPlatform).first();

    const newImpressions = (current?.impressions || 0) + impressions;
    const newEngagements = (current?.engagements || 0) + engagements;
    const newClicks      = (current?.clicks || 0) + clicks;
    const newRate        = calculateEngagementRate(newImpressions, newEngagements);

    const uuid = crypto.randomUUID();

    // 2. Upsert using INSERT ... ON CONFLICT
    await db.prepare(`
      INSERT INTO template_performance
        (id, brand_id, template_id, platform, impressions, engagements, clicks, engagement_rate, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(brand_id, template_id, platform) DO UPDATE SET
        impressions = excluded.impressions,
        engagements = excluded.engagements,
        clicks = excluded.clicks,
        engagement_rate = excluded.engagement_rate,
        last_updated = datetime('now')
    `).bind(
      uuid,
      brand_id,
      template_id,
      normalizedPlatform,
      newImpressions,
      newEngagements,
      newClicks,
      newRate
    ).run();

    return true;
  } catch (err) {
    console.error("[TEMPLATE ANALYTICS] Failed to update template metrics", err);
    return false;
  }
}

/**
 * Reset metrics for a brand template platform (useful for testing or cache flushes)
 */
export async function resetTemplateMetrics(db, { brand_id, template_id, platform }) {
  if (!brand_id || !template_id || !platform) return false;

  try {
    await db.prepare(`
      UPDATE template_performance
      SET impressions = 0, engagements = 0, clicks = 0, engagement_rate = 0.0, last_updated = datetime('now')
      WHERE brand_id = ? AND template_id = ? AND platform = ?
    `).bind(brand_id, template_id, platform.toLowerCase()).run();
    return true;
  } catch (err) {
    console.error("[TEMPLATE ANALYTICS] Failed to reset metrics", err);
    return false;
  }
}
