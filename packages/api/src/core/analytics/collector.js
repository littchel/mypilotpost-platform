import { getDB } from "../../lib/db.js";

/**
 * Record analytics event (idempotent-friendly)
 *
 * event = {
 *   brand_id,
 *   content_type,
 *   content_id,
 *   impressions,
 *   engagements,
 *   clicks
 * }
 */
export async function recordAnalytics(env, event) {
  const db = getDB(env);

  const {
    brand_id,
    content_type,
    content_id,
    impressions = 0,
    engagements = 0,
    clicks = 0,
  } = event;

  /* Upsert content analytics */
  await db.prepare(`
    INSERT INTO content_analytics (
      id,
      brand_id,
      content_type,
      content_id,
      impressions,
      engagements,
      clicks
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(content_type, content_id)
    DO UPDATE SET
      impressions = impressions + excluded.impressions,
      engagements = engagements + excluded.engagements,
      clicks = clicks + excluded.clicks,
      updated_at = CURRENT_TIMESTAMP
  `)
    .bind(
      crypto.randomUUID(),
      brand_id,
      content_type,
      content_id,
      impressions,
      engagements,
      clicks
    )
    .run();

  /* Daily rollup */
  const date = new Date().toISOString().slice(0, 10);

  await db.prepare(`
    INSERT INTO daily_analytics (
      id,
      brand_id,
      date,
      impressions,
      engagements,
      clicks
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(brand_id, date)
    DO UPDATE SET
      impressions = impressions + excluded.impressions,
      engagements = engagements + excluded.engagements,
      clicks = clicks + excluded.clicks
  `)
    .bind(
      crypto.randomUUID(),
      brand_id,
      date,
      impressions,
      engagements,
      clicks
    )
    .run();
}
