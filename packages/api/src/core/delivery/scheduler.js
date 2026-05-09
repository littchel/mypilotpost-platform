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

  const now = new Date().toISOString();

  const jobs = await db
    .prepare(
      `
      SELECT *
      FROM delivery_jobs
      WHERE ((status = 'scheduled' AND scheduled_at <= ?)
         OR (status = 'processing' AND updated_at < datetime('now', '-5 minutes')))
         AND delivery_attempts < 3
      ORDER BY scheduled_at ASC
      LIMIT ?
      `
    )
    .bind(now, BATCH_LIMIT)
    .all();

  if (!jobs.results || jobs.results.length === 0) {
    return;
  }

  for (const job of jobs.results) {
    // Fire-and-forget each job, but keep traceability
    ctx.waitUntil(
      executeDeliveryJob(env, job).catch((err) => {
        console.error(
          "Delivery execution failed",
          job.id,
          err
        );
      })
    );
  }
}
