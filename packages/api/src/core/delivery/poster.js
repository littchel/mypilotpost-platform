/**
 * myPilotPost — Delivery Executor (Phase 3)
 * File: packages/api/src/core/delivery/poster.js
 *
 * RESPONSIBILITIES:
 * - Execute a single delivery job
 * - Record delivery_attempts
 * - Transition job status truthfully
 * - Emit notifications & brand memory
 *
 * EXCLUDES:
 * - Scheduling logic
 * - Retry policy (delegated)
 * - Cron orchestration
 */

import { getDB } from "../../lib/db.js";
import { writeBrandMemoryEvent } from "../brand/memory-writer.js";
import { scheduleRetry } from "./retries.js";

/* =====================================================
   PLATFORM ADAPTER REGISTRY (LOCKED)
===================================================== */

import * as instagram from "../platforms/instagram.js";
import * as facebook from "../platforms/facebook.js";
import * as linkedin from "../platforms/linkedin.js";

const ADAPTERS = {
  instagram,
  facebook,
  linkedin
};

/* =====================================================
   EXECUTE DELIVERY JOB
===================================================== */

export async function executeDeliveryJob(env, job) {
  const db = getDB(env);

  const adapter = ADAPTERS[job.platform];
  if (!adapter) {
    await markFailed(db, job, "unsupported_platform", "No adapter found");
    return;
  }

  const attemptNumber = await getNextAttemptNumber(db, job.id);

  let response;
  try {
    response = await adapter.deliver({
      content_id: job.content_id,
      brand_id: job.brand_id
    });
  } catch (err) {
    await recordAttempt(db, job, attemptNumber, "failed", "network_error", err.message);
    await scheduleRetry(db, job, attemptNumber);
    return;
  }

  if (response.success) {
    await recordAttempt(db, job, attemptNumber, "success");

    await db
      .prepare(
        `
        UPDATE delivery_jobs
        SET status = 'completed'
        WHERE id = ?
        `
      )
      .bind(job.id)
      .run();

    await writeBrandMemoryEvent(db, {
      brandId: job.brand_id,
      eventType: "delivery_completed",
      entityType: "content",
      platform: job.platform,
      scheduled_at: job.scheduled_at,
      delivered_at: new Date().toISOString()
    });

    await insertNotification(
      db,
      job.brand_id,
      "delivery_completed",
      `${job.platform} post published`
    );

    return;
  }

  // Failure path
  await recordAttempt(
    db,
    job,
    attemptNumber,
    "failed",
    response.error_code,
    response.error_message
  );

  await scheduleRetry(db, job, attemptNumber, response.error_code);
}

/* =====================================================
   HELPERS
===================================================== */

async function getNextAttemptNumber(db, jobId) {
  const row = await db
    .prepare(
      `
      SELECT MAX(attempt_number) as max
      FROM delivery_attempts
      WHERE job_id = ?
      `
    )
    .bind(jobId)
    .first();

  return (row?.max || 0) + 1;
}

async function recordAttempt(
  db,
  job,
  attempt,
  status,
  errorCode = null,
  errorMessage = null
) {
  await db
    .prepare(
      `
      INSERT INTO delivery_attempts (
        job_id,
        attempt_number,
        platform,
        status,
        error_code,
        error_message,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
    )
    .bind(
      job.id,
      attempt,
      job.platform,
      status,
      errorCode,
      errorMessage
    )
    .run();
}

async function markFailed(db, job, errorCode, errorMessage) {
  await recordAttempt(db, job, 1, "failed", errorCode, errorMessage);

  await db
    .prepare(
      `
      UPDATE delivery_jobs
      SET status = 'failed'
      WHERE id = ?
      `
    )
    .bind(job.id)
    .run();

  await writeBrandMemoryEvent(db, {
    brandId: job.brand_id,
    eventType: "delivery_failed",
    entityType: "content",
    platform: job.platform,
    error_code: errorCode,
    attempts: 1
  });
}

async function insertNotification(db, brandId, type, message) {
  await db
    .prepare(
      `
      INSERT INTO notifications (brand_id, type, message, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `
    )
    .bind(brandId, type, message)
    .run();
}
