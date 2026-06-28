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
    SELECT COUNT(*) as total FROM notifications
    WHERE brand_id = ?
      AND (recipient_id = ? OR recipient_id = 'brand')
  `).bind(auth.brand_id, auth.user_id).first();
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
        AND (n.recipient_id = ? OR n.recipient_id = 'brand')
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(auth.user_id, auth.brand_id, auth.user_id, limit, offset)
    .all();

  // 3. Unread count
  const unreadRow = await db.prepare(`
    SELECT COUNT(*) as unread FROM notifications n
    LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
    WHERE n.brand_id = ?
      AND (n.recipient_id = ? OR n.recipient_id = 'brand')
      AND nr.notification_id IS NULL
  `).bind(auth.user_id, auth.brand_id, auth.user_id).first();

  return json({
    data: (results || []).map(n => ({
      id: n.id,
      type: mapNotificationType(n.type),
      title: n.title,
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
 * GET /api/customer/notifications/unread-count
 * Lightweight polling endpoint — returns only the unread badge count.
 * Frontend polls this every 30s instead of fetching the full list.
 */
export async function getUnreadCount(request, env, auth) {
  if (!auth?.user_id || !auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  const db = getDB(env);
  const row = await db.prepare(`
    SELECT COUNT(*) as unread
    FROM notifications n
    LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
    WHERE n.brand_id = ?
      AND (n.recipient_id = ? OR n.recipient_id = 'brand')
      AND nr.notification_id IS NULL
  `).bind(auth.user_id, auth.brand_id, auth.user_id).first();

  return json({ unread_count: row?.unread || 0 });
}

/**
 * System Event Handler for Notifications
 */
export async function handleNotificationEvent({ env, eventType, payload }) {
  const { brand_id, user_id, message, title } = payload;
  if (!brand_id) return;

  // Only create a notification for events with a defined title mapping.
  // Unmapped events (audit_generated, insight_resolved, report_generated,
  // content_submitted, invite_created, etc.) would produce a generic
  // "Notification / You have a new update" record — skip them.
  const resolvedTitle = title || getTitleForEvent(eventType);
  if (!resolvedTitle || resolvedTitle === 'Notification') return;

  const db = getDB(env);
  const type = mapEventTypeToNotificationType(eventType);

  await db.prepare(`
    INSERT INTO notifications (id, recipient_type, recipient_id, brand_id, type, title, message)
    VALUES (?, 'user', ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    user_id || 'brand',
    brand_id,
    type,
    resolvedTitle,
    message || getMessageForEvent(eventType, payload)
  ).run();
}

/* ================================================================
   NOTIFICATION TYPE REGISTRY — 15 canonical types
================================================================ */

export const NOTIFICATION_TYPES = {
  content_approved:         { display: "Content Approved",          channel_type: "success", email_default: true  },
  content_rejected:         { display: "Changes Requested",         channel_type: "warning", email_default: true  },
  content_comment:          { display: "New Comment",               channel_type: "info",    email_default: false },
  post_scheduled:           { display: "Post Scheduled",            channel_type: "info",    email_default: false },
  post_published:           { display: "Post Published",            channel_type: "success", email_default: false },
  post_failed:              { display: "Post Delivery Failed",      channel_type: "alert",   email_default: true  },
  brand_score_changed:      { display: "Brand Score Updated",       channel_type: "info",    email_default: false },
  intel_report_ready:       { display: "Intelligence Report Ready", channel_type: "info",    email_default: true  },
  approval_required:        { display: "Review Requested",          channel_type: "warning", email_default: true  },
  team_invite:              { display: "Team Invitation Sent",      channel_type: "info",    email_default: true  },
  team_joined:              { display: "New Team Member",           channel_type: "success", email_default: false },
  trial_expiring:           { display: "Trial Ending Soon",         channel_type: "warning", email_default: true  },
  milestone_reached:        { display: "Milestone Unlocked",        channel_type: "success", email_default: false },
  integration_disconnected: { display: "Platform Disconnected",     channel_type: "alert",   email_default: true  },
  weekly_digest:            { display: "Weekly Summary",            channel_type: "system",  email_default: true  },
};

/**
 * GET /api/customer/notifications/preferences
 * Returns current preferences, merged with defaults for missing types.
 */
export async function getPreferences(request, env, auth) {
  if (!auth?.user_id || !auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT notif_type, in_app, email
    FROM notification_preferences
    WHERE user_id = ? AND brand_id = ?
  `).bind(auth.user_id, auth.brand_id).all();

  const saved = Object.fromEntries((results || []).map(r => [r.notif_type, r]));

  const prefs = Object.entries(NOTIFICATION_TYPES).map(([type, meta]) => ({
    type,
    display: meta.display,
    channel_type: meta.channel_type,
    in_app: saved[type]?.in_app ?? 1,
    email:  saved[type]?.email  ?? (meta.email_default ? 1 : 0),
  }));

  return json({ preferences: prefs });
}

/**
 * PUT /api/customer/notifications/preferences
 * Body: { preferences: [{ type, in_app, email }] }
 */
export async function updatePreferences(request, env, auth) {
  if (!auth?.user_id || !auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  let body;
  try { body = await request.json(); } catch {
    return error("Invalid JSON", "INVALID_JSON", null, 400);
  }

  const updates = Array.isArray(body?.preferences) ? body.preferences : [];
  if (!updates.length) return error("preferences array required", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const validTypes = new Set(Object.keys(NOTIFICATION_TYPES));

  const stmts = updates
    .filter(p => validTypes.has(p.type))
    .map(p => db.prepare(`
      INSERT INTO notification_preferences (user_id, brand_id, notif_type, in_app, email, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (user_id, brand_id, notif_type)
      DO UPDATE SET in_app = excluded.in_app, email = excluded.email, updated_at = excluded.updated_at
    `).bind(
      auth.user_id,
      auth.brand_id,
      p.type,
      p.in_app ? 1 : 0,
      p.email  ? 1 : 0
    ));

  if (stmts.length) await db.batch(stmts);
  return json({ ok: true, updated: stmts.length });
}

/**
 * emitNotification — preference-aware notification emitter.
 * Call this from anywhere in the API to fire a typed notification.
 *
 * @param {object} env
 * @param {object} opts
 * @param {string} opts.type        — one of NOTIFICATION_TYPES keys
 * @param {string} opts.brand_id
 * @param {string} opts.user_id     — notification target
 * @param {string} [opts.title]     — override default display name
 * @param {string} opts.message
 * @param {object} [opts.data]      — extra JSON payload stored on the row
 */
export async function emitNotification(env, { type, brand_id, user_id, title, message, data = null }) {
  if (!NOTIFICATION_TYPES[type]) {
    console.warn(`[NOTIFY] Unknown type: ${type}`);
    return null;
  }

  const meta  = NOTIFICATION_TYPES[type];
  const db    = getDB(env);

  // Load preferences (fall back to defaults if not yet set)
  const pref = await db.prepare(`
    SELECT in_app, email FROM notification_preferences
    WHERE user_id = ? AND brand_id = ? AND notif_type = ?
  `).bind(user_id, brand_id, type).first();

  const want_in_app = pref ? !!pref.in_app : true;
  const want_email  = pref ? !!pref.email  : meta.email_default;

  const notif_id = crypto.randomUUID();
  const resolved_title = title || meta.display;

  if (want_in_app) {
    await db.prepare(`
      INSERT INTO notifications (id, recipient_type, recipient_id, brand_id, type, title, message, data)
      VALUES (?, 'user', ?, ?, ?, ?, ?, ?)
    `).bind(
      notif_id, user_id, brand_id,
      meta.channel_type, resolved_title, message,
      data ? JSON.stringify(data) : null
    ).run();

    await db.prepare(`
      INSERT INTO notification_delivery_logs (notification_id, user_id, channel, status)
      VALUES (?, ?, 'in_app', 'sent')
    `).bind(notif_id, user_id).run();
  }

  if (want_email) {
    const user = await db.prepare(`SELECT email FROM users WHERE id = ?`).bind(user_id).first();
    if (user?.email) {
      await db.prepare(`
        INSERT INTO email_outbox (id, customer_id, template, to_email, subject, payload, status)
        VALUES (?, ?, 'notification_email', ?, ?, ?, 'pending')
      `).bind(
        crypto.randomUUID(), user_id,
        user.email,
        resolved_title,
        JSON.stringify({ type, title: resolved_title, message, brand_id, data })
      ).run();

      await db.prepare(`
        INSERT INTO notification_delivery_logs (notification_id, user_id, channel, status)
        VALUES (?, ?, 'email', 'queued')
      `).bind(notif_id, user_id).run();
    }
  }

  return notif_id;
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
