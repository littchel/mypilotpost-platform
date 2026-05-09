/**
 * myPilotPost — Delivery Executor (Standardized)
 * File: packages/api/src/core/delivery/poster.js
 */

import { getDB } from "../../lib/db.js";
import { writeBrandMemoryEvent } from "../brands/memory-writer.js";
import { scheduleRetry } from "./retries.js";
import { insertExperienceNotification } from "../notifications/utils.js";
import { refreshPerformanceCache } from "../campaigns/campaigns.js";
import { resolveDeliveryData } from "./resolver.js";
import { emitEvent } from "../../lib/bus.js";

/* =====================================================
   PLATFORM ADAPTER REGISTRY
===================================================== */
import * as instagram from "../platforms/instagram.js";
import * as facebook from "../platforms/facebook.js";
import * as linkedin from "../platforms/linkedin.js";
import * as tiktok from "../platforms/tiktok.js";
import * as x from "../platforms/x.js";
import * as google from "../platforms/google.js";
import * as pinterest from "../platforms/pinterest.js";
import * as wordpress from "../platforms/wordpress.js";

const ADAPTERS = {
  instagram,
  facebook,
  linkedin,
  tiktok,
  x,
  google,
  pinterest,
  wordpress
};

const MAX_ATTEMPTS = 3;
const DELIVERY_TIMEOUT_MS = 25000; // Increased for media uploads

/* =====================================================
   EXECUTE DELIVERY JOB
===================================================== */

export async function executeDeliveryJob(env, job) {
  // 1️⃣ Initialize Execution Context
  globalThis.__ENV__ = env; 
  const db = getDB(env);

  // 2️⃣ Double Execution Protection
  const lock = await db
    .prepare(`
      UPDATE delivery_jobs
      SET status = 'processing', 
          delivery_attempts = delivery_attempts + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? 
        AND (status IN ('scheduled', 'pending', 'failed') OR (status = 'processing' AND updated_at < datetime('now', '-5 minutes')))
        AND delivery_attempts < ?
    `)
    .bind(job.id, MAX_ATTEMPTS)
    .run();

  if (lock.meta.changes === 0) return;

  try {
    // 3️⃣ Resolve Unified Data (LOCKED CONTRACT)
    const { content, connection } = await resolveDeliveryData(env, job);

    // 4️⃣ Execute via Standardized Adapter
    const adapter = ADAPTERS[job.platform];
    if (!adapter) throw new Error(`UNSUPPORTED_PLATFORM: ${job.platform}`);

    console.log(`POSTER: Executing ${job.platform} delivery`, { job_id: job.id, content_id: job.content_id });

    // Race against timeout
    const result = await Promise.race([
      adapter.publish({ content, connection, env }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), DELIVERY_TIMEOUT_MS))
    ]);

    // 5️⃣ Success Path
    await recordAttempt(db, job, job.delivery_attempts + 1, "success");
    await syncContentStatusWithJobs(db, job, 'success', null, result.external_id);
    
    await writeBrandMemoryEvent(db, {
      brandId: job.brand_id,
      eventType: "delivery_completed",
      entityType: content.type,
      platform: job.platform
    });

  } catch (err) {
    const errorCode = err.message?.includes("TOKEN") ? "AUTH_ERROR" : 
                     err.message === "TIMEOUT" ? "TIMEOUT" : "EXECUTION_ERROR";
    
    console.error(`POSTER: ${job.platform} delivery failed`, { job_id: job.id, error: err.message });

    await recordAttempt(db, job, job.delivery_attempts + 1, "failed", errorCode, err.message);
    await syncContentStatusWithJobs(db, job, 'failed', errorCode);
    
    // Automatic Retry Logic
    await scheduleRetry(db, job, job.delivery_attempts + 1, errorCode);
  }
}

/* =====================================================
   STATE SYNC (AUTHORITATIVE)
===================================================== */

async function syncContentStatusWithJobs(db, job, platformStatus, errorType = null, externalId = null) {
  const contentTable = job.content_type === 'blog' ? 'blog_posts' : 'social_assets';
  
  // 1. Update this specific job
  await db.prepare(`
    UPDATE delivery_jobs
    SET status = ?, 
        last_error = ?,
        external_post_id = ?,
        published_at = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    platformStatus === 'success' ? 'published' : 'failed',
    errorType,
    externalId,
    platformStatus === 'success' ? new Date().toISOString() : null,
    job.id
  ).run();

  // 2. Aggregate status for parent asset
  const allJobs = await db.prepare(`SELECT status FROM delivery_jobs WHERE content_id = ?`).bind(job.content_id).all();
  const statuses = (allJobs.results || []).map(j => j.status);
  
  let aggregateStatus = 'processing';
  const publishedCount = statuses.filter(s => s === 'published').length;
  const failedCount = statuses.filter(s => s === 'failed').length;
  const totalCount = statuses.length;

  if (publishedCount + failedCount >= totalCount) {
    if (publishedCount === totalCount) aggregateStatus = 'published';
    else if (failedCount === totalCount) aggregateStatus = 'failed';
    else aggregateStatus = 'partial_failure';
  }

  // 3. Sync Asset & Drafts
  await db.batch([
    db.prepare(`UPDATE ${contentTable} SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(aggregateStatus, job.content_id),
    db.prepare(`UPDATE content_drafts SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE content_id = ?`).bind(aggregateStatus, job.content_id)
  ]);

  // 4. Notifications
  if (platformStatus === 'success') {
    await insertExperienceNotification(db, job.brand_id, "success", `Published to ${job.platform}`, "Post is live 🚀");
    
    // Growth Engine Integration
    await emitEvent(env, 'content_published', { 
      brand_id: job.brand_id, 
      user_id: job.user_id, // Ensure user_id is available in job
      content_id: job.content_id,
      meta: { platform: job.platform }
    });
  } else {
    await insertExperienceNotification(db, job.brand_id, "failure", `Delivery Failed: ${job.platform}`, errorType);
  }

  if (job.campaign_id) await refreshPerformanceCache(db, job.campaign_id);
}

async function recordAttempt(db, job, attempt, status, errorCode = null, errorMessage = null) {
  await db.prepare(`
    INSERT INTO delivery_attempts (job_id, attempt_number, platform, status, error_code, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(job.id, attempt, job.platform, status, errorCode, errorMessage).run();
}
