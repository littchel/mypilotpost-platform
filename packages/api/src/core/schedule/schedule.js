/**
 * myPilotPost — Real Calendar Engine (Phase 2)
 * AUTHORITATIVE • D1 SAFE • CRASH PROOF • PRODUCTION LOCK
 */

import { error, json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { toLocalTime } from "../../lib/dates.js";
import { logEvent } from "../../lib/events.js";
import { isValidUUID, isValidISO8601 } from "../../lib/validation.js";

/* =====================================================
   HELPERS
===================================================== */

function safeJsonParse(str) {
  try {
    return JSON.parse(str || "{}");
  } catch {
    return {};
  }
}

/**
 * Force deterministic SQLite datetime format:
 * YYYY-MM-DD HH:MM:SS.000
 */
export function normalizeForSQLite(isoString) {
  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    return null;
  }

  const iso = date.toISOString(); // 2026-05-11T08:00:00.000Z

  return iso.replace("T", " ").replace("Z", "");
}

/**
 * Convert ISO → UNIX seconds
 * Never return falsy 0 incorrectly
 */
function toUnixSeconds(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;
  return Math.floor(date.getTime() / 1000);
}

async function getBrandTimezone(db, brandId) {
  const row = await db
    .prepare(`SELECT timezone FROM brands WHERE id = ?`)
    .bind(brandId)
    .first();

  return row?.timezone || "UTC";
}

/**
 * 🔒 15-minute conflict check (D1 safe)
 */
export async function hasConflict(
  db,
  brandId,
  platform,
  scheduledAtUtc,
  excludeJobId = null
) {
  const unix = toUnixSeconds(scheduledAtUtc);
  if (unix === null) return false;

  const row = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM delivery_jobs
      WHERE brand_id = ?
        AND platform = ?
        AND status = 'scheduled'
        AND (? IS NULL OR id != ?)
        AND ABS(
          CAST(strftime('%s', scheduled_at) AS INTEGER) - ?
        ) < 900
    `)
    .bind(
      brandId,
      platform,
      excludeJobId,
      excludeJobId,
      unix
    )
    .first();

  return (row?.count || 0) > 0;
}

/* =====================================================
   GET /api/customer/schedule
===================================================== */

export async function getSchedule(request, env, auth) {
  try {
    if (!auth?.brand_id) {
      return json({ error: "Unauthorized" }, 401);
    }

    const db = getDB(env);
    const brandId = auth.brand_id;

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to || !isValidISO8601(from) || !isValidISO8601(to)) {
      return error("Valid from and to (ISO8601) are required", "INVALID_INPUT", null, 400);
    }

    const timezone = await getBrandTimezone(db, brandId);

    const { results } = await db
      .prepare(`
        SELECT id, content_type, content_id, platform,
               scheduled_at, status, metadata
        FROM delivery_jobs
        WHERE brand_id = ?
          AND scheduled_at BETWEEN ? AND ?
        ORDER BY scheduled_at ASC
      `)
      .bind(brandId, from, to)
      .all();

    return json({
      view: "range",
      timezone,
      items: (results || []).map((job) => {
        const meta = safeJsonParse(job.metadata);
        return {
          job_id: job.id,
          content_type: job.content_type,
          content_id: job.content_id,
          platform: job.platform,
          scheduled_at: job.scheduled_at,
          local_time: toLocalTime(job.scheduled_at, timezone),
          status: job.status,
          hashtags: meta.hashtags || []
        };
      }),
    });

  } catch (err) {
    return error("Internal error", "SERVER_ERROR", String(err), 500);
  }
}

/* =====================================================
   CREATE
===================================================== */

export async function createSchedule(request, env, auth) {
  try {
    if (!auth?.brand_id) {
      return error("Unauthorized", "UNAUTHORIZED", null, 401);
    }

    const body = await request.json();

    const {
      content_type,
      content_id,
      platform,
      scheduled_at,
      metadata = {}
    } = body || {};

    if (!content_type || !content_id || !platform || !scheduled_at) {
      return error("Missing required fields", "BAD_REQUEST", null, 400);
    }

    if (!isValidUUID(content_id)) {
      return error("Invalid content_id", "INVALID_ID", null, 400);
    }

    const normalized = normalizeForSQLite(scheduled_at);
    if (!normalized || !isValidISO8601(scheduled_at)) {
      return error("Invalid scheduled_at format", "INVALID_DATE", null, 400);
    }

    const db = getDB(env);
    const brandId = auth.brand_id;

    if (await hasConflict(db, brandId, platform, scheduled_at)) {
      return json(
        { error: "Another post is already scheduled near this time on this platform" },
        409
      );
    }

    const hashtags = metadata?.hashtags || [];
    const jobId = crypto.randomUUID();

    const result = await db
      .prepare(`
        INSERT INTO delivery_jobs (
          id,
          brand_id,
          content_type,
          content_id,
          platform,
          scheduled_at,
          status,
          metadata,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        jobId,
        brandId,
        content_type,
        content_id,
        platform,
        normalized,
        JSON.stringify({ hashtags })
      )
      .run();

    try {
      if (hashtags.length) {
        await logEvent(env, {
          event_type: "hashtags_attached",
          brand_id: brandId,
          user_id: auth.user_id || null,
          content_id,
          metadata: { platform, count: hashtags.length }
        });
      }
    } catch (e) {
      // Slient fail for events in production
    }

    return json(
      {
        success: true,
        job_id: jobId
      },
      201
    );

  } catch (err) {
    return error("Internal error", "SERVER_ERROR", String(err), 500);
  }
}

/* =====================================================
   UPDATE
===================================================== */

export async function updateSchedule(request, env, auth, jobId) {
  try {
    if (!auth?.brand_id) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await request.json();
    const db = getDB(env);
    const brandId = auth.brand_id;

    const job = await db
      .prepare(`
        SELECT status, platform
        FROM delivery_jobs
        WHERE id = ? AND brand_id = ?
      `)
      .bind(jobId, brandId)
      .first();

    if (!job || job.status !== "scheduled") {
      return error("Only scheduled jobs can be updated", "CONFLICT", null, 409);
    }

    const effectivePlatform = body.platform || job.platform;

    if (body.scheduled_at) {
      const normalized = normalizeForSQLite(body.scheduled_at);
      if (!normalized || !isValidISO8601(body.scheduled_at)) {
        return error("Invalid scheduled_at format", "INVALID_DATE", null, 400);
      }

      if (await hasConflict(
        db,
        brandId,
        effectivePlatform,
        body.scheduled_at,
        jobId
      )) {
        return error("Scheduling conflict detected", "CONFLICT", null, 409);
      }

      body._normalizedTime = normalized;
    }

    await db
      .prepare(`
        UPDATE delivery_jobs
        SET
          platform = COALESCE(?, platform),
          scheduled_at = COALESCE(?, scheduled_at),
          metadata = COALESCE(?, metadata)
        WHERE id = ? AND brand_id = ?
      `)
      .bind(
        body.platform || null,
        body._normalizedTime || null,
        body.metadata ? JSON.stringify(body.metadata) : null,
        jobId,
        brandId
      )
      .run();

    return json({ success: true });

  } catch (err) {
    return error("Internal error", "SERVER_ERROR", String(err), 500);
  }
}

/* =====================================================
   DELETE
===================================================== */

export async function deleteSchedule(_request, env, auth, jobId) {
  try {
    if (!auth?.brand_id) {
      return error("Unauthorized", "UNAUTHORIZED", null, 401);
    }
    if (!isValidUUID(jobId)) {
      return error("Invalid Job ID", "INVALID_ID", null, 400);
    }

    const db = getDB(env);
    const brandId = auth.brand_id;

    const res = await db
      .prepare(`
        UPDATE delivery_jobs
        SET status = 'cancelled'
        WHERE id = ? AND brand_id = ? AND status = 'scheduled'
      `)
      .bind(jobId, brandId)
      .run();

    if (res.changes === 0) {
      return error("Only scheduled jobs can be cancelled", "CONFLICT", null, 409);
    }

    return json({ success: true });

  } catch (err) {
    return error("Internal error", "SERVER_ERROR", String(err), 500);
  }
}
