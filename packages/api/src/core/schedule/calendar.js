// packages/api/src/core/schedule/calendar.js
// Unified calendar endpoint — all content types for a date range

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
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 14);
  const defaultTo = new Date(now);
  defaultTo.setDate(defaultTo.getDate() + 60);

  const from = safeDate(url.searchParams.get("from"), defaultFrom.toISOString());
  const to = safeDate(url.searchParams.get("to"), defaultTo.toISOString());

  const db = getDB(env);
  const brandId = auth.brand_id;

  // 1. Delivery jobs (scheduled, published, failed) — have explicit scheduled_at
  const { results: jobs } = await db.prepare(`
    SELECT
      dj.id,
      dj.content_id,
      dj.platform,
      dj.scheduled_at AS date,
      dj.status,
      dj.content_type,
      cv.title
    FROM delivery_jobs dj
    LEFT JOIN content_vault cv ON cv.id = dj.content_id
    WHERE dj.brand_id = ?
      AND dj.status NOT IN ('cancelled')
      AND dj.scheduled_at BETWEEN ? AND ?
    ORDER BY dj.scheduled_at ASC
  `).bind(brandId, from, to).all();

  // 2. Content vault items not covered by delivery_jobs
  //    (approvals, approved, published without a delivery_job in range)
  const { results: vaultItems } = await db.prepare(`
    SELECT
      cv.id,
      cv.content_type,
      cv.lifecycle_status AS status,
      cv.title,
      cv.updated_at AS date
    FROM content_vault cv
    WHERE cv.brand_id = ?
      AND cv.lifecycle_status IN ('approval', 'approval_requested', 'approved', 'published')
      AND cv.updated_at BETWEEN ? AND ?
    ORDER BY cv.updated_at DESC
  `).bind(brandId, from, to).all();

  // Track content_ids that have a delivery_job so we don't double-show
  const jobContentIds = new Set((jobs || []).map(j => j.content_id));

  const items = [
    ...(jobs || []).map(j => ({
      id: j.id,
      content_id: j.content_id,
      kind: j.status === 'published' ? 'published' : 'scheduled',
      content_type: j.content_type || 'social',
      title: j.title || 'Untitled',
      date: j.date,
      platform: j.platform,
      status: j.status
    })),
    ...(vaultItems || [])
      .filter(v => !jobContentIds.has(v.id))
      .map(v => ({
        id: v.id,
        content_id: v.id,
        kind: v.status === 'published' ? 'published' :
              (v.status.includes('approval') ? 'approval' :
              (v.status === 'approved' ? 'approved' : 'content')),
        content_type: v.content_type,
        title: v.title || 'Untitled',
        date: v.date,
        platform: null,
        status: v.status
      }))
  ];

  return json({ items, from, to });
}
