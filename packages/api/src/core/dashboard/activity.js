// packages/api/src/core/dashboard/activity.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * DASHBOARD ACTIVITY — UNIFIED FEED (v2.0)
 * UNION ALL across: content_drafts, delivery_jobs, notifications, lifecycle_events
 * All sources normalized to: { time, action, status, entity_type, entity_id }
 * Brand-scoped, zero-state safe, paginated.
 */
export async function getActivity(request, env, auth) {
  if (!auth?.brand_id) {
    return error("Brand context missing", "BAD_REQUEST", null, 400);
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit")) || 20;
  const offset = parseInt(url.searchParams.get("offset")) || 0;

  const db = getDB(env);
  const brandId = auth.brand_id;

  // UNION ALL across all active sources
  const { results } = await db.prepare(`
    SELECT
      COALESCE(updated_at, created_at) AS time,
      status     AS action,
      status     AS status,
      'content'  AS entity_type,
      id         AS entity_id
    FROM social_assets
    WHERE brand_id = ?

    UNION ALL

    SELECT
      created_at AS time,
      'notification' AS action,
      type       AS status,
      'system'   AS entity_type,
      id         AS entity_id
    FROM notifications
    WHERE brand_id = ?

    UNION ALL

    SELECT
      COALESCE(published_at, updated_at, created_at) AS time,
      'published'  AS action,
      status       AS status,
      'delivery'   AS entity_type,
      id           AS entity_id
    FROM delivery_jobs
    WHERE brand_id = ? AND status = 'published'

    UNION ALL

    SELECT
      COALESCE(updated_at, created_at) AS time,
      'Post failed due to ' || COALESCE(last_error, 'UNKNOWN') AS action,
      status    AS status,
      'delivery' AS entity_type,
      id         AS entity_id
    FROM delivery_jobs
    WHERE brand_id = ? AND status = 'failed'

    ORDER BY time DESC
    LIMIT ? OFFSET ?
  `).bind(brandId, brandId, brandId, brandId, limit, offset).all();

  return json({
    data: (results || []).map(r => ({
      time:        r.time,
      action:      r.action,
      status:      r.status,
      entity_type: r.entity_type,
      entity_id:   r.entity_id,
    })),
    pagination: { limit, offset }
  });
}

