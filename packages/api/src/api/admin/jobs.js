// packages/api/src/api/admin/jobs.js
// Platform Ops → Jobs. Read-only delivery-job queue + admin retry. Source: delivery_jobs.

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logAdminAction } from "../../lib/admin_logger.js";
import { executeDeliveryJob } from "../../core/delivery/poster.js";

/**
 * GET /api/v1/admin/jobs?status=&platform=&limit=
 * Returns the delivery-job queue with owner, duration, retry, last run, error.
 */
export async function listAdminJobs(request, env) {
  const db  = getDB(env);
  const url = new URL(request.url);
  const status   = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");
  const limit    = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500);

  const where = [];
  const binds = [];
  if (status)   { where.push("dj.status = ?");   binds.push(status); }
  if (platform) { where.push("dj.platform = ?"); binds.push(platform); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { results } = await db.prepare(`
    SELECT
      dj.id, dj.brand_id, dj.user_id, dj.content_id, dj.content_type, dj.platform,
      dj.status, dj.scheduled_at, dj.created_at, dj.processed_at, dj.published_at,
      dj.delivery_attempts, dj.last_error, dj.external_error_message, dj.updated_at,
      b.name  AS brand_name,
      u.email AS owner_email
    FROM delivery_jobs dj
    LEFT JOIN brands b ON b.id = dj.brand_id
    LEFT JOIN users  u ON u.id = dj.user_id
    ${whereSql}
    ORDER BY dj.created_at DESC
    LIMIT ${limit}
  `).bind(...binds).all().catch(() => ({ results: [] }));

  const jobs = (results || []).map(j => {
    // Duration = (processed/published) − created, in seconds
    const start = j.created_at ? new Date(j.created_at).getTime() : null;
    const end   = (j.published_at || j.processed_at) ? new Date(j.published_at || j.processed_at).getTime() : null;
    const duration_s = (start && end && end >= start) ? Math.round((end - start) / 1000) : null;
    return {
      id: j.id,
      job: j.content_type ? `${j.content_type} → ${j.platform}` : j.platform,
      platform: j.platform,
      content_id: j.content_id,
      owner: j.owner_email || j.brand_name || j.brand_id,
      brand_name: j.brand_name,
      status: j.status,
      duration_s,
      retry: j.delivery_attempts || 0,
      retryable: (j.status === "failed" || j.status === "partial_failure") && (j.delivery_attempts || 0) < 3,
      last_run: j.published_at || j.processed_at || j.updated_at || j.created_at,
      scheduled_at: j.scheduled_at,
      error: j.last_error || j.external_error_message || null,
    };
  });

  // Queue summary (operational)
  const summary = await db.prepare(`
    SELECT
      SUM(CASE WHEN status IN ('scheduled','processing','queued') THEN 1 ELSE 0 END) AS queued,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN status = 'failed' AND delivery_attempts >= 3 THEN 1 ELSE 0 END) AS dead
    FROM delivery_jobs
  `).first().catch(() => ({}));

  return json({ jobs, summary: {
    queued: summary?.queued || 0, failed: summary?.failed || 0,
    published: summary?.published || 0, dead: summary?.dead || 0,
  } });
}

/**
 * POST /api/v1/admin/jobs/:id/retry
 * Admin retry of a single failed delivery job (any brand). Audited.
 */
export async function retryAdminJob(request, env, auth, jobId) {
  const db = getDB(env);
  const job = await db.prepare("SELECT * FROM delivery_jobs WHERE id = ?").bind(jobId).first();
  if (!job) return error("Job not found", "NOT_FOUND", null, 404);
  if (job.status !== "failed" && job.status !== "partial_failure")
    return error("Only failed jobs can be retried", "BAD_REQUEST", null, 400);
  if ((job.delivery_attempts || 0) >= 3)
    return error("Maximum retry attempts reached", "MAX_ATTEMPTS_REACHED", null, 400);

  let result;
  try {
    await executeDeliveryJob(env, job);
    result = { success: true, message: "Retry triggered" };
  } catch (err) {
    return error("Retry execution failed: " + err.message, "RETRY_FAILED", null, 500);
  }

  await logAdminAction(env, auth, "retry_delivery_job", "delivery_job", jobId, {
    platform: job.platform, brand_id: job.brand_id, prior_attempts: job.delivery_attempts || 0,
  });
  return json(result);
}
