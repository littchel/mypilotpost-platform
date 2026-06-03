// packages/api/src/core/schedule/calendar.js
// Scheduler calendar — only scheduled/published delivery_jobs

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

function safeDate(str, fallback) {
  const d = new Date(str);
  return isNaN(d.getTime()) ? fallback : d.toISOString();
}

export async function getCalendarItems(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const url = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo   = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const from = safeDate(url.searchParams.get("from"), defaultFrom.toISOString());
  const to   = safeDate(url.searchParams.get("to"),   defaultTo.toISOString());

  const db = getDB(env);
  const brandId = auth.brand_id;

  const { results } = await db.prepare(`
    SELECT
      dj.id,
      dj.content_id,
      dj.platform,
      dj.scheduled_at AS date,
      dj.status,
      dj.content_type,
      cv.title,
      cv.body        AS caption,
      CASE
        WHEN cv.media_ids IS NOT NULL
          AND cv.media_ids != '[]'
          AND cv.media_ids != 'null'
          AND cv.media_ids != ''
        THEN 1 ELSE 0
      END AS has_media
    FROM delivery_jobs dj
    LEFT JOIN content_vault cv ON cv.id = dj.content_id
    WHERE dj.brand_id = ?
      AND dj.status IN ('scheduled', 'published', 'failed', 'partial_failure')
      AND dj.scheduled_at BETWEEN ? AND ?
    ORDER BY dj.scheduled_at ASC
  `).bind(brandId, from, to).all();

  return json({ items: results || [], from, to });
}
