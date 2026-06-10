/**
 * myPilotPost — Delivery Scheduler (Phase 3)
 * File: packages/api/src/core/delivery/scheduler.js
 *
 * RESPONSIBILITIES:
 * - Pick up due delivery jobs
 * - Execute jobs exactly once per run
 * - Delegate execution to poster.js
 *
 * EXCLUDES:
 * - Retry policy
 * - Platform adapters
 * - Scheduling logic
 */

import { getDB } from "../../lib/db.js";
import { executeDeliveryJob } from "./poster.js";
import { writeSystemEvent } from "../../api/admin/observability.js";
import { isControlActive } from "../../lib/controls.js";

/* =====================================================
   CONFIG
===================================================== */

const BATCH_LIMIT = 10;

/* =====================================================
   CRON ENTRYPOINT
===================================================== */

/**
 * This function is intended to be called from a
 * Cloudflare Worker cron trigger (every 1 minute).
 */
export async function runDeliveryScheduler(env, ctx) {
  const db = getDB(env);

  // Phase 4: pause_delivery kill-switch
  if (await isControlActive(db, 'pause_delivery')) {
    console.log('[SCHEDULER] Delivery paused via platform_controls');
    return;
  }

  const now = new Date().toISOString();

  // Phase 8: skip jobs belonging to disabled users
  const jobs = await db
    .prepare(
      `
      SELECT dj.*
      FROM delivery_jobs dj
      JOIN users u ON u.id = dj.user_id
      WHERE ((dj.status IN ('scheduled','pending') AND dj.scheduled_at <= ?)
         OR (dj.status = 'processing' AND dj.updated_at < datetime('now', '-5 minutes')))
         AND dj.delivery_attempts < 3
         AND u.is_active = 1
      ORDER BY dj.scheduled_at ASC
      LIMIT ?
      `
    )
    .bind(now, BATCH_LIMIT)
    .all();

  if (!jobs.results || jobs.results.length === 0) {
    return;
  }

  for (const job of jobs.results) {
    ctx.waitUntil(
      executeDeliveryJob(env, job).catch((err) => {
        console.error('Delivery execution failed', job.id, err);
        writeSystemEvent(env, {
          severity: 'warning',
          source: 'scheduler',
          message: `Scheduler: execution error for job ${job.id} on ${job.platform}`,
          metadata: JSON.stringify({ job_id: job.id, platform: job.platform, error: err.message })
        }).catch(() => {});
      })
    );
  }
}
