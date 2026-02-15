// packages/api/src/core/notifications/notifications.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/customer/notifications
 * - Brand-scoped
 * - User-aware (via notification_reads)
 * - Stable response shape
 */
export async function getNotifications(request, env, auth) {
  if (!auth?.brand_id || !auth?.user_id) {
    return error("Unauthorized", 401);
  }

  const db = getDB(env);

  const { results } = await db
    .prepare(`
      SELECT
        n.id,
        n.type,
        n.title,
        n.message,
        n.meta,
        n.created_at,
        CASE
          WHEN nr.notification_id IS NULL THEN 0
          ELSE 1
        END AS is_read
      FROM notifications n
      LEFT JOIN notification_reads nr
        ON nr.notification_id = n.id
       AND nr.user_id = ?
      WHERE n.brand_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `)
    .bind(auth.user_id, auth.brand_id)
    .all();

  return json({
    brand_id: auth.brand_id,
    notifications: (results || []).map(n => ({
      ...n,
      is_read: Boolean(n.is_read),
      meta: n.meta ? JSON.parse(n.meta) : null
    }))
  });
}

/**
 * POST /api/customer/notifications/read
 * Body:
 *  - { id: number }
 *  - OR { notification_ids: number[] }
 *
 * - Idempotent
 * - User-scoped
 * - Brand-safe
 */
export async function markNotificationRead(request, env, auth) {
  if (!auth?.user_id || !auth?.brand_id) {
    return error("Unauthorized", 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const ids = Array.isArray(body?.notification_ids)
    ? body.notification_ids
    : body?.id
    ? [body.id]
    : [];

  if (ids.length === 0) {
    return error("notification id(s) required", 400);
  }

  const db = getDB(env);

  // Optional brand safety check (cheap, safe)
  const placeholders = ids.map(() => "?").join(",");
  const owned = await db
    .prepare(`
      SELECT id FROM notifications
      WHERE brand_id = ?
        AND id IN (${placeholders})
    `)
    .bind(auth.brand_id, ...ids)
    .all();

  if (!owned.results.length) {
    return error("Notification not found", 404);
  }

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO notification_reads (
      notification_id,
      user_id,
      read_at
    )
    VALUES (?, ?, datetime('now'))
  `);

  for (const n of owned.results) {
    await stmt.bind(n.id, auth.user_id).run();
  }

  return json({ success: true });
}
