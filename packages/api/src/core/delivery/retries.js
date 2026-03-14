/**
 * myPilotPost — Delivery Executor (Phase 3)
 * File: packages/api/src/core/delivery/retries.js
 *
 * RESPONSIBILITIES:
 * - Schedule retry attempts for failed deliveries
 * - Apply exponential backoff strategy
 * - Update job status when max retries exceeded
 * - Emit brand memory events for retry lifecycle
 *
 * EXCLUDES:
 * - Actual delivery execution (delegated to poster.js)
 * - Cron scheduling (delegated to orchestrator)
 */

import { getDB } from "../../lib/db.js";
import { writeBrandMemoryEvent } from "../brands/memory-writer.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MINUTES = 5;

/* =====================================================
   SCHEDULE RETRY
===================================================== */

export async function scheduleRetry(db, job, attemptNumber, errorCode = null) {
  // Check if we've exceeded max retries
  if (attemptNumber >= MAX_RETRIES) {
    await markJobPermanentlyFailed(db, job, attemptNumber, errorCode);
    return;
  }

  // Calculate next retry time with exponential backoff
  const nextRetryAt = calculateNextRetryTime(attemptNumber);
  
  // Update the job with retry information
  await db
    .prepare(
      `
      UPDATE delivery_jobs
      SET 
        status = 'pending',
        retry_count = ?,
        next_retry_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `
    )
    .bind(attemptNumber, nextRetryAt.toISOString(), job.id)
    .run();

  // Record retry scheduled event in brand memory
  await writeBrandMemoryEvent(db, {
    brandId: job.brand_id,
    eventType: "delivery_retry_scheduled",
    entityType: "content",
    platform: job.platform,
    attempt_number: attemptNumber,
    next_retry_at: nextRetryAt.toISOString(),
    error_code: errorCode
  });

  // Create notification for retry scheduling
  await insertNotification(
    db,
    job.brand_id,
    "delivery_retry_scheduled",
    `Retry scheduled for ${job.platform} post (attempt ${attemptNumber + 1}/${MAX_RETRIES})`
  );
}

/* =====================================================
   PERMANENT FAILURE HANDLING
===================================================== */

async function markJobPermanentlyFailed(db, job, attemptNumber, errorCode) {
  await db
    .prepare(
      `
      UPDATE delivery_jobs
      SET 
        status = 'failed',
        failed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `
    )
    .bind(job.id)
    .run();

  await writeBrandMemoryEvent(db, {
    brandId: job.brand_id,
    eventType: "delivery_permanently_failed",
    entityType: "content",
    platform: job.platform,
    final_attempt: attemptNumber,
    error_code: errorCode,
    scheduled_at: job.scheduled_at
  });

  await insertNotification(
    db,
    job.brand_id,
    "delivery_failed_permanent",
    `${job.platform} post permanently failed after ${MAX_RETRIES} attempts`
  );
}

/* =====================================================
   RETRY CANDIDATE FETCHING
===================================================== */

export async function getJobsDueForRetry(db) {
  const now = new Date().toISOString();
  
  const jobs = await db
    .prepare(
      `
      SELECT *
      FROM delivery_jobs
      WHERE 
        status = 'pending' 
        AND next_retry_at <= ?
        AND retry_count > 0
        AND retry_count < ?
      ORDER BY next_retry_at ASC
      LIMIT 50
      `
    )
    .bind(now, MAX_RETRIES)
    .all();

  return jobs.results || [];
}

/* =====================================================
   HELPERS
===================================================== */

function calculateNextRetryTime(attemptNumber) {
  const delayMinutes = BASE_DELAY_MINUTES * Math.pow(2, attemptNumber - 1);
  const now = new Date();
  return new Date(now.getTime() + delayMinutes * 60000);
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

/* =====================================================
   RETRY CONFIGURATION GETTERS
===================================================== */

export function getMaxRetries() {
  return MAX_RETRIES;
}

export function getBaseDelayMinutes() {
  return BASE_DELAY_MINUTES;
}