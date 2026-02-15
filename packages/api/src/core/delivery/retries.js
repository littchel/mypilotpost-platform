/**
 * myPilotPost — Retry Policy Engine (Phase 3)
 * File: packages/api/src/core/delivery/retries.js
 *
 * RESPONSIBILITIES:
 * - Decide if retry is allowed
 * - Schedule retry timing
 * - Mark terminal failures
 */

import { writeBrandMemoryEvent } from "../brand/memory-writer.js";

/* =====================================================
   RETRY POLICY (LOCKED)
===================================================== */

const MAX_ATTEMPTS = 3;

const RETRY_DELAYS_MINUTES = {
  1: 0,
  2: 5,
  3: 15
};

const NON_RETRYABLE_ERRORS = [
  "auth_failed",
  "validation_error"
];

/* =====================================================
   RETRY DECISION
===================================================== */

export async function scheduleRetry(db, job, attemptNumber, errorCode = null) {
  if (
    attemptNumber >= MAX_ATTEMPTS ||
    NON_RETRYABLE_ERRORS.includes(errorCode)
  ) {
    await markTerminalFailure(db, job, attemptNumber, errorCode);
    return;
  }

  const delayMinutes = RETRY_DELAYS_MINUTES[attemptNumber + 1];
  const nextRun = new Date(
    Date.now() + delayMinutes * 60 * 1000
  ).toISOString();

  await db
    .prepare(
      `
      UPDATE delivery_jobs
      SET scheduled_at = ?
      WHERE id = ?
        AND status = 'scheduled'
      `
    )
    .bind(nextRun, job.id)
    .run();
}

/* =====================================================
   TERMINAL FAILURE
===================================================== */

async function markTerminalFailure(db, job, attempts, errorCode) {
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
    attempts
  });
}
