// packages/api/src/core/notifications/notifications.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/customer/notifications
 * - Brand-scoped
 * - User-aware (via notification_reads)
 * - Pagination supported
 * - Standardized types: alert, success, warning, info, system
 */
export async function getNotifications(request, env, auth) {
  if (!auth?.brand_id || !auth?.user_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit")) || 20;
  const offset = parseInt(url.searchParams.get("offset")) || 0;

  const db = getDB(env);

  // 1. Total count
  const countRow = await db.prepare(`
    SELECT COUNT(*) as total FROM notifications WHERE brand_id = ?
  `).bind(auth.brand_id).first();
  const total = countRow?.total || 0;

  // 2. Fetch results
  const { results } = await db
    .prepare(`
      SELECT
        n.id,
        n.type,
        n.title,
        n.message,
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
      LIMIT ? OFFSET ?
    `)
    .bind(auth.user_id, auth.brand_id, limit, offset)
    .all();

  // 3. Unread count
  const unreadRow = await db.prepare(`
    SELECT COUNT(*) as unread FROM notifications n
    LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
    WHERE n.brand_id = ? AND nr.notification_id IS NULL
  `).bind(auth.user_id, auth.brand_id).first();

  return json({
    data: (results || []).map(n => ({
      id: n.id,
      type: mapNotificationType(n.type),
      message: n.message || n.title,
      read: Boolean(n.is_read),
      created_at: n.created_at
    })),
    pagination: {
      limit,
      offset,
      total,
      unread_count: unreadRow?.unread || 0
    }
  });
}

function mapNotificationType(type) {
  const valid = ["alert", "success", "warning", "info", "system"];
  const t = (type || "info").toLowerCase();
  return valid.includes(t) ? t : "info";
}

/**
 * POST /api/customer/notifications/read
 */
export async function markNotificationRead(request, env, auth) {
  if (!auth?.user_id || !auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", "INVALID_JSON", null, 400);
  }

  const ids = Array.isArray(body?.notification_ids)
    ? body.notification_ids
    : body?.id
    ? [body.id]
    : [];

  if (ids.length === 0) {
    return error("notification id(s) required", "BAD_REQUEST", null, 400);
  }

  const db = getDB(env);

  const placeholders = ids.map(() => "?").join(",");
  const { results: owned } = await db
    .prepare(`
      SELECT id FROM notifications
      WHERE brand_id = ?
        AND id IN (${placeholders})
    `)
    .bind(auth.brand_id, ...ids)
    .all();

  if (!owned || !owned.length) {
    return error("Notification not found", "NOT_FOUND", null, 404);
  }

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO notification_reads (
      notification_id,
      user_id,
      read_at
    )
    VALUES (?, ?, datetime('now'))
  `);

  for (const n of owned) {
    await stmt.bind(n.id, auth.user_id).run();
  }

  return json({ success: true });
}

/**
 * POST /api/customer/notifications/read-all
 */
export async function markAllRead(request, env, auth) {
  if (!auth?.user_id || !auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  const db = getDB(env);

  // Insert read markers for all notifications belonging to the brand that aren't already read
  await db.prepare(`
    INSERT OR IGNORE INTO notification_reads (notification_id, user_id, read_at)
    SELECT id, ?, datetime('now')
    FROM notifications
    WHERE brand_id = ?
  `).bind(auth.user_id, auth.brand_id).run();

  return json({ success: true });
}

/**
 * System Event Handler for Notifications
 */
export async function handleNotificationEvent({ env, eventType, payload }) {
  const { brand_id, user_id, message, title } = payload;
  if (!brand_id) return;

  const db = getDB(env);

  const id = crypto.randomUUID();
  const type = mapEventTypeToNotificationType(eventType);

  await db.prepare(`
    INSERT INTO notifications (id, brand_id, type, title, message)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    brand_id,
    type,
    title || getTitleForEvent(eventType),
    message || getMessageForEvent(eventType, payload)
  ).run();
}

function mapEventTypeToNotificationType(eventType) {
  if (eventType.includes('approved')) return 'success';
  if (eventType.includes('rejected')) return 'warning';
  if (eventType.includes('published')) return 'success';
  if (eventType.includes('referral_')) return 'success';
  if (eventType.includes('reward')) return 'success';
  return 'info';
}

function getTitleForEvent(type) {
  const titles = {
    'content_approved': 'Content Approved',
    'content_rejected': 'Changes Requested',
    'content_published': 'Post Published',
    'invite_accepted': 'New Team Member',
    'insight_generated': 'New Brand Insight',
    'referral_signup': 'New Referral!',
    'referral_activation': 'Referral Activated 🚀',
    'daily_login': 'Daily Streak'
  };
  return titles[type] || 'Notification';
}

function getMessageForEvent(type, payload) {
  const messages = {
    'content_approved': 'Your content has been approved and is ready for scheduling.',
    'content_rejected': 'The client has requested changes to your recent draft.',
    'content_published': 'Your post is now live on social channels.',
    'invite_accepted': 'A new member has joined your brand team.',
    'insight_generated': 'We have a new recommendation to improve your brand performance.',
    'referral_signup': 'Someone just signed up using your link! +40 points.',
    'referral_activation': 'Your referral just published their first post! +60 points.',
    'daily_login': 'Welcome back! Your streak is growing.'
  };
  return messages[type] || 'You have a new update.';
}
