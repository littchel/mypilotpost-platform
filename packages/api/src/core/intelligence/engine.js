/**
 * myPilotPost — Brand Intelligence Engine
 * Actionable Insights & Advisory
 */

import { getDB } from "../../lib/db.js";

/**
 * Handle system events for Intelligence
 */
export async function handleIntelligenceEvent({ env, eventType, payload }) {
  const { brand_id } = payload;
  if (!brand_id) return;

  const db = getDB(env);

  // Example Insight Generation based on event
  if (eventType === 'content_published') {
    await checkPostDensity(db, brand_id);
  } else if (eventType === 'content_rejected') {
    await createRejectionInsight(db, brand_id, payload);
  }

  // Periodic triggers (from scheduler) would call other functions here
}

/**
 * Check if the brand is posting enough
 */
async function checkPostDensity(db, brand_id) {
  // Query last 7 days of published content
  const { results } = await db.prepare(`
    SELECT COUNT(*) as count FROM usage_events
    WHERE brand_id = ? AND event_type = 'content_published'
    AND created_at > datetime('now', '-7 days')
  `).bind(brand_id).all();

  const count = results?.[0]?.count || 0;

  if (count < 3) {
    await upsertInsight(db, {
      brand_id,
      type: 'performance',
      priority: 'medium',
      message: 'Your posting frequency is lower than recommended (3+ posts/week). Increasing frequency improves engagement by up to 40%.',
      action_link: '/calendar',
      metadata: { current_weekly_count: count }
    });
  }
}

async function createRejectionInsight(db, brand_id, payload) {
  await upsertInsight(db, {
    brand_id,
    type: 'advisory',
    priority: 'high',
    message: `Content was rejected by the client. Review the feedback and update your brand guidelines to avoid future alignment issues.`,
    action_link: '/approvals',
    metadata: { content_id: payload.content_id }
  });
}

/**
 * Helper to prevent duplicate active insights
 */
async function upsertInsight(db, insight) {
  const { brand_id, type, priority, message, action_link, metadata } = insight;

  // Check if an unresolved insight of this type exists
  const existing = await db.prepare(`
    SELECT id FROM brand_insights
    WHERE brand_id = ? AND type = ? AND resolved = 0
  `).bind(brand_id, type).first();

  if (existing) {
    await db.prepare(`
      UPDATE brand_insights
      SET priority = ?, message = ?, metadata = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(priority, message, JSON.stringify(metadata), existing.id).run();
  } else {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO brand_insights (id, brand_id, type, priority, message, action_link, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, brand_id, type, priority, message, action_link, JSON.stringify(metadata)).run();
  }
}
