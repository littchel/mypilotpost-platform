/**
 * myPilotPost — Delivery Retry System
 * SURLGICAL RETRY • V1 PRODUCTION
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { executeDeliveryJob } from "./poster.js";

/**
 * POST /api/customer/delivery/retry
 * Retries a specific job or all failed jobs for a content piece.
 */
export async function manualRetryJob(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const { job_id, content_id } = await request.json();
  const db = getDB(env);

  if (job_id) {
    // 1. Single Job Retry
    const job = await db.prepare(`SELECT * FROM delivery_jobs WHERE id = ? AND brand_id = ?`).bind(job_id, auth.brand_id).first();
    if (!job) return error("Job not found", 404);
    if (job.status !== 'failed' && job.status !== 'partial_failure') return error("Only failed jobs can be retried", 400);
    if (job.delivery_attempts >= 3) return error("Maximum retry attempts (3) reached for this job", 400);

    // Reset status to processing (to avoid scheduler picking it up twice if we trigger now)
    await db.prepare(`UPDATE delivery_jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(job_id).run();

    // Trigger execution
    try {
      await executeDeliveryJob(env, job);
      return json({ success: true, message: "Retry triggered" });
    } catch (err) {
      return error("Retry execution failed: " + err.message, 500);
    }
  } else if (content_id) {
    // 2. All Failed Jobs for Content (Surgical)
    const failedJobs = await db.prepare(`
      SELECT * FROM delivery_jobs 
      WHERE content_id = ? AND brand_id = ? AND status = 'failed'
    `).bind(content_id, auth.brand_id).all();

    if (!failedJobs.results || failedJobs.results.length === 0) {
      return error("No failed jobs found for this content", 404);
    }

    const tasks = [];
    for (const job of failedJobs.results) {
       await db.prepare(`UPDATE delivery_jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(job.id).run();
       tasks.push(executeDeliveryJob(env, job));
    }

    await Promise.allSettled(tasks);
    return json({ success: true, retried_count: failedJobs.results.length });
  }

  return error("Either job_id or content_id is required", 400);
}

/**
 * AUTOMATIC RETRY SCHEDULER
 * Enforces attempt limits and schedules future execution.
 */
export async function scheduleRetry(db, job, currentAttempt, errorType) {
  if (currentAttempt >= 3) {
    console.warn("RETRY: Exhausted all attempts for job", { job_id: job.id });
    return;
  }

  // Define backoff (STRICT: 30s for 2nd attempt, 3m for 3rd attempt)
  const backoffSeconds = currentAttempt === 1 ? 30 : 180;
  const nextRun = new Date(Date.now() + backoffSeconds * 1000).toISOString();

  console.log("RETRY: Scheduling next attempt", { 
    job_id: job.id, 
    attempt: currentAttempt + 1, 
    in: `${backoffSeconds}s` 
  });

  await db.prepare(`
    UPDATE delivery_jobs 
    SET status = 'scheduled', 
        scheduled_at = ?,
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(nextRun, job.id).run();
}