// packages/api/src/core/dashboard/summary.js

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * DASHBOARD SUMMARY — PHASE 2B
 * - Read-only
 * - Brand-scoped
 * - Schema-aligned
 * - Never throws
 */
export async function getDashboardSummary(env, customer) {
  if (!customer?.brand_id) {
    return json({ error: "Brand context missing" }, 400);
  }

  const db = getDB(env);
  const brandId = customer.brand_id;

  // Scheduled posts
  const scheduledRow = await db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM delivery_jobs
      WHERE brand_id = ?
        AND status = 'scheduled'
    `)
    .bind(brandId)
    .first();

  // Delivered posts
  const deliveredRow = await db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM delivery_jobs
      WHERE brand_id = ?
        AND status = 'delivered'
    `)
    .bind(brandId)
    .first();

  // Recent brand memory (no severity filtering yet)
  const { results: alerts } = await db
    .prepare(`
      SELECT
        id,
        type,
        payload,
        created_at
      FROM brand_memory_events
      WHERE brand_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `)
    .bind(brandId)
    .all();

  return json({
    brand_id: brandId,
    summary: {
      status: "ok",
      posts_scheduled: scheduledRow?.count || 0,
      posts_delivered: deliveredRow?.count || 0,
      usage: {
        scheduled: scheduledRow?.count || 0,
        delivered: deliveredRow?.count || 0
      },
      alerts: alerts || []
    }
  });
}
