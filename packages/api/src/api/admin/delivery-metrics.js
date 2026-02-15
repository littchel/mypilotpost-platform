import { getDB } from "../../lib/db.js";

/**
 * Aggregate daily delivery metrics
 * Intended to be run by cron (daily)
 */
export async function aggregateDeliveryMetrics(env) {
  const db = getDB(env);
  const date = new Date().toISOString().slice(0, 10);

  const stats = await db.prepare(`
    SELECT
      COUNT(*) FILTER (WHERE state = 'scheduled') AS scheduled,
      COUNT(*) FILTER (WHERE state = 'delivered') AS delivered,
      COUNT(*) FILTER (WHERE state = 'failed') AS failed
    FROM content_delivery_jobs
    WHERE DATE(updated_at) = ?
  `)
    .bind(date)
    .first();

  await db.prepare(`
    INSERT INTO admin_delivery_metrics (
      id,
      date,
      scheduled,
      delivered,
      failed
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date)
    DO UPDATE SET
      scheduled = excluded.scheduled,
      delivered = excluded.delivered,
      failed = excluded.failed
  `)
    .bind(
      crypto.randomUUID(),
      date,
      stats?.scheduled || 0,
      stats?.delivered || 0,
      stats?.failed || 0
    )
    .run();
}
