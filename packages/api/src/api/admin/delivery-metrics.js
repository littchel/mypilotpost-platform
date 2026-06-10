import { getDB } from "../../lib/db.js";

/**
 * Aggregate daily delivery metrics — called from the 0 3 * * * cron.
 */
export async function aggregateDeliveryMetrics(env) {
  const db = getDB(env);
  const date = new Date().toISOString().slice(0, 10);

  const stats = await db.prepare(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled,
      COUNT(*) FILTER (WHERE status = 'published') AS delivered,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed
    FROM delivery_jobs
    WHERE DATE(created_at) = ?
  `)
    .bind(date)
    .first();

  await db.prepare(`
    INSERT INTO admin_delivery_metrics (id, date, scheduled, delivered, failed)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      scheduled = excluded.scheduled,
      delivered = excluded.delivered,
      failed    = excluded.failed
  `)
    .bind(
      crypto.randomUUID(),
      date,
      stats?.scheduled || 0,
      stats?.delivered || 0,
      stats?.failed    || 0
    )
    .run();

  // Also refresh platform_health from last 24h delivery outcomes
  await updatePlatformHealth(db);
}

/**
 * Update platform_health based on recent delivery outcomes.
 * healthy  — failure_rate < 10%
 * warning  — 10–30%
 * degraded — 30–60%
 * down     — >60% or zero successes in 24h after at least 5 attempts
 */
export async function updatePlatformHealth(db) {
  const { results: platforms } = await db.prepare(`
    SELECT platform,
           COUNT(*) as total,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
           MAX(CASE WHEN status = 'published' THEN updated_at END) as last_success_at,
           MAX(CASE WHEN status = 'failed'    THEN updated_at END) as last_failure_at
    FROM delivery_jobs
    WHERE updated_at > datetime('now', '-24 hours')
    GROUP BY platform
  `).all().catch(() => ({ results: [] }));

  for (const row of (platforms || [])) {
    const rate = row.total > 0 ? row.failed / row.total : 0;
    let status = 'healthy';
    if (rate > 0.6 || (row.total >= 5 && row.last_success_at === null)) status = 'down';
    else if (rate > 0.3) status = 'degraded';
    else if (rate > 0.1) status = 'warning';

    await db.prepare(`
      INSERT INTO platform_health (platform, status, failure_count, last_failure_at, last_success_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(platform) DO UPDATE SET
        status          = excluded.status,
        failure_count   = excluded.failure_count,
        last_failure_at = COALESCE(excluded.last_failure_at, last_failure_at),
        last_success_at = COALESCE(excluded.last_success_at, last_success_at),
        updated_at      = CURRENT_TIMESTAMP
    `).bind(row.platform, status, row.failed, row.last_failure_at, row.last_success_at).run().catch(() => {});
  }
}
