/**
 * myPilotPost — Real Calendar Engine (Phase 2)
 * AUTHORITATIVE • D1 SAFE • CRASH PROOF • PRODUCTION LOCK
 */

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { toLocalTime } from "../../lib/dates.js";
import { logEvent } from "../../lib/events.js";

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
function normalizeForSQLite(isoString) {
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
async function hasConflict(
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

    if (!from || !to) {
      return json({ error: "from and to are required" }, 400);
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
    console.error("GET SCHEDULE ERROR:", err);
    return json({ error: "Internal error" }, 500);
  }
}

/* =====================================================
   CREATE
===================================================== */

export async function createSchedule(request, env, auth) {
  try {
    if (!auth?.brand_id) {
      return json({ error: "Unauthorized" }, 401);
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
      return json({ error: "Missing required fields" }, 400);
    }

    const normalized = normalizeForSQLite(scheduled_at);
    if (!normalized) {
      return json({ error: "Invalid scheduled_at format" }, 400);
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

    const result = await db
      .prepare(`
        INSERT INTO delivery_jobs (
          brand_id,
          content_type,
          content_id,
          platform,
          scheduled_at,
          status,
          metadata,
          created_at
        ) VALUES (?, ?, ?, ?, ?, 'scheduled', ?, CURRENT_TIMESTAMP)
      `)
      .bind(
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
      console.error("Event log failed:", e);
    }

    return json(
      {
        success: true,
        job_id: result?.meta?.last_row_id ?? result?.lastRowId ?? null
      },
      201
    );

  } catch (err) {
    console.error("CREATE ERROR:", err);
    return json({ error: "Internal error" }, 500);
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
      return json({ error: "Only scheduled jobs can be updated" }, 409);
    }

    const effectivePlatform = body.platform || job.platform;

    if (body.scheduled_at) {
      const normalized = normalizeForSQLite(body.scheduled_at);
      if (!normalized) {
        return json({ error: "Invalid scheduled_at format" }, 400);
      }

      if (await hasConflict(
        db,
        brandId,
        effectivePlatform,
        body.scheduled_at,
        jobId
      )) {
        return json({ error: "Scheduling conflict detected" }, 409);
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
    console.error("UPDATE ERROR:", err);
    return json({ error: "Internal error" }, 500);
  }
}

/* =====================================================
   DELETE
===================================================== */

export async function deleteSchedule(_request, env, auth, jobId) {
  try {
    if (!auth?.brand_id) {
      return json({ error: "Unauthorized" }, 401);
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
      return json({ error: "Only scheduled jobs can be cancelled" }, 409);
    }

    return json({ success: true });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    return json({ error: "Internal error" }, 500);
  }
}
