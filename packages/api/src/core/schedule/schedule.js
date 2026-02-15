/**
 * myPilotPost — Real Calendar Engine (Phase 2)
 * File: packages/api/src/core/schedule/schedule.js
 */

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { toLocalTime } from "../../lib/dates.js";
import { logEvent } from "../../lib/events.js";

/* =====================================================
   HELPERS
===================================================== */

function assertTimezone(brandSettings) {
  if (!brandSettings?.timezone) {
    const err = new Error("Brand timezone is required to schedule content");
    err.status = 400;
    throw err;
  }
}

/**
 * ✅ FIXED — schema-truthful
 * brands table has `timezone`, NOT `settings`
 */
async function getBrandSettings(db, brandId) {
  const row = await db
    .prepare(`SELECT timezone FROM brands WHERE id = ?`)
    .bind(brandId)
    .first();

  return {
    timezone: row?.timezone || null
  };
}

async function hasConflict(
  db,
  brandId,
  platform,
  scheduledAtUtc,
  excludeJobId = null
) {
  const result = await db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM delivery_jobs
      WHERE brand_id = ?
        AND platform = ?
        AND status = 'scheduled'
        AND (? IS NULL OR id != ?)
        AND ABS(
          strftime('%s', scheduled_at) -
          strftime('%s', ?)
        ) < 900
      `
    )
    .bind(
      brandId,
      platform,
      excludeJobId,
      excludeJobId,
      scheduledAtUtc
    )
    .first();

  return (result?.count || 0) > 0;
}

/* =====================================================
   GET /api/customer/schedule
===================================================== */

export async function getSchedule(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  const db = getDB(env);
  const brandId = auth.brand_id;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to) {
    const err = new Error("from and to query params are required");
    err.status = 400;
    throw err;
  }

  const brandSettings = await getBrandSettings(db, brandId);
  assertTimezone(brandSettings);

  const { results } = await db
    .prepare(
      `
      SELECT id, content_type, content_id, platform, scheduled_at, status, metadata
      FROM delivery_jobs
      WHERE brand_id = ?
        AND scheduled_at BETWEEN ? AND ?
      ORDER BY scheduled_at ASC
      `
    )
    .bind(brandId, from, to)
    .all();

  return json({
    view: "range",
    timezone: brandSettings.timezone,
    items: (results || []).map((job) => {
      const meta = JSON.parse(job.metadata || "{}");
      return {
        job_id: job.id,
        content_type: job.content_type,
        content_id: job.content_id,
        platform: job.platform,
        scheduled_at: job.scheduled_at,
        local_time: toLocalTime(job.scheduled_at, brandSettings.timezone),
        status: job.status,
        hashtags: meta.hashtags || []
      };
    }),
  });
}

/* =====================================================
   POST /api/customer/schedule/prepare
===================================================== */

export async function prepareSchedule(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    const err = new Error("Invalid JSON body");
    err.status = 400;
    throw err;
  }

  if (!body?.date) {
    const err = new Error("date is required");
    err.status = 400;
    throw err;
  }

  const db = getDB(env);
  const brandSettings = await getBrandSettings(db, auth.brand_id);
  assertTimezone(brandSettings);

  return json({
    available_slots: ["08:00", "09:00", "10:00", "12:00", "15:00"],
    drafts: [],
  });
}

/* =====================================================
   POST /api/customer/schedule
===================================================== */

export async function createSchedule(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    const err = new Error("Invalid JSON body");
    err.status = 400;
    throw err;
  }

  const {
    content_type,
    content_id,
    platform,
    scheduled_at,
    metadata = {}
  } = body || {};

  if (!content_type || !content_id || !platform || !scheduled_at) {
    const err = new Error("Missing required scheduling fields");
    err.status = 400;
    throw err;
  }

  const db = getDB(env);
  const brandId = auth.brand_id;

  const brandSettings = await getBrandSettings(db, brandId);
  assertTimezone(brandSettings);

  if (await hasConflict(db, brandId, platform, scheduled_at)) {
    const err = new Error(
      "Another post is already scheduled near this time on this platform"
    );
    err.status = 409;
    throw err;
  }

  const hashtags = metadata.hashtags || [];

  const result = await db
    .prepare(
      `
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
      `
    )
    .bind(
      brandId,
      content_type,
      content_id,
      platform,
      scheduled_at,
      JSON.stringify({ hashtags })
    )
    .run();

  /* ===============================
     EVENT: HASHTAGS ATTACHED
  =============================== */
  if (hashtags.length) {
    try {
      await logEvent(env, {
        event_type: "hashtags_attached",
        brand_id: brandId,
        user_id: auth.user_id || null,
        content_id,
        metadata: {
          platform,
          count: hashtags.length,
          hashtags
        }
      });
    } catch (err) {
      console.error("[schedule:hashtags]", err?.message || err);
    }
  }

  return json(
    {
      success: true,
      job_id: result.lastRowId
    },
    201
  );
}

/* =====================================================
   PUT /api/customer/schedule/:job_id
===================================================== */

export async function updateSchedule(request, env, auth, jobId) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    const err = new Error("Invalid JSON body");
    err.status = 400;
    throw err;
  }

  if (!body?.platform && !body?.scheduled_at && !body?.metadata) {
    const err = new Error("Nothing to update");
    err.status = 400;
    throw err;
  }

  const db = getDB(env);
  const brandId = auth.brand_id;

  const job = await db
    .prepare(
      `
      SELECT status, platform, content_id, metadata
      FROM delivery_jobs
      WHERE id = ? AND brand_id = ?
      `
    )
    .bind(jobId, brandId)
    .first();

  if (!job || job.status !== "scheduled") {
    const err = new Error("Only scheduled jobs can be updated");
    err.status = 409;
    throw err;
  }

  const effectivePlatform = body.platform || job.platform;

  if (
    body.scheduled_at &&
    (await hasConflict(
      db,
      brandId,
      effectivePlatform,
      body.scheduled_at,
      jobId
    ))
  ) {
    const err = new Error("Scheduling conflict detected");
    err.status = 409;
    throw err;
  }

  const newMetadata = body.metadata
    ? JSON.stringify(body.metadata)
    : null;

  await db
    .prepare(
      `
      UPDATE delivery_jobs
      SET
        platform = COALESCE(?, platform),
        scheduled_at = COALESCE(?, scheduled_at),
        metadata = COALESCE(?, metadata)
      WHERE id = ? AND brand_id = ?
      `
    )
    .bind(
      body.platform,
      body.scheduled_at,
      newMetadata,
      jobId,
      brandId
    )
    .run();

  /* ===============================
     EVENT: HASHTAGS UPDATED
  =============================== */
  if (body.metadata?.hashtags) {
    try {
      await logEvent(env, {
        event_type: "hashtags_attached",
        brand_id: brandId,
        user_id: auth.user_id || null,
        content_id: job.content_id,
        metadata: {
          platform: effectivePlatform,
          count: body.metadata.hashtags.length,
          hashtags: body.metadata.hashtags,
          updated: true
        }
      });
    } catch (err) {
      console.error("[schedule:update:hashtags]", err?.message || err);
    }
  }

  return json({ success: true });
}

/* =====================================================
   DELETE /api/customer/schedule/:job_id
===================================================== */

export async function deleteSchedule(_request, env, auth, jobId) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  const db = getDB(env);
  const brandId = auth.brand_id;

  const res = await db
    .prepare(
      `
      UPDATE delivery_jobs
      SET status = 'cancelled'
      WHERE id = ? AND brand_id = ? AND status = 'scheduled'
      `
    )
    .bind(jobId, brandId)
    .run();

  if (res.changes === 0) {
    const err = new Error("Only scheduled jobs can be cancelled");
    err.status = 409;
    throw err;
  }

  return json({ success: true });
}
