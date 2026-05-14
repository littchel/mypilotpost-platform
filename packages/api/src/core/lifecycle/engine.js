// packages/api/src/core/lifecycle/engine.js
// Lifecycle Email Engine — Phase 4
// Handles cooldown, unsubscribe check, template rendering, and outbox queuing.

import { getDB } from "../../lib/db.js";
import { EMAIL_RULES } from "./email-rules.js";
import { TEMPLATE_REGISTRY } from "../email/templates/index.js";

const APP_URL = "https://app.mypilotpost.com";

/**
 * Primary entry point. Call from anywhere in the API to trigger a lifecycle email.
 *
 * @param {object} env
 * @param {object} opts
 * @param {string} opts.userId       — target user
 * @param {string} [opts.brandId]
 * @param {string} opts.type         — one of EMAIL_RULES keys
 * @param {object} [opts.payload]    — template data (first_name, brand_name, etc.)
 */
export async function triggerLifecycleEmail(env, { userId, brandId = null, type, payload = {} }) {
  const rule = EMAIL_RULES[type];
  if (!rule) {
    console.warn(`[LIFECYCLE] Unknown event type: ${type}`);
    return null;
  }

  const db = getDB(env);

  // 1. Resolve user email
  const user = await db.prepare(
    `SELECT email, first_name, last_name FROM users WHERE id = ?`
  ).bind(userId).first();

  if (!user?.email) return null;

  // 2. Check unsubscribe
  const unsub = await db.prepare(
    `SELECT categories FROM email_unsubscribes WHERE user_id = ?`
  ).bind(userId).first();

  if (unsub) {
    const cats = unsub.categories;
    if (cats === "all" || cats?.includes(rule.category) || cats?.includes("all")) {
      return null; // user unsubscribed from this category
    }
  }

  // 3. Cooldown check
  if (rule.cooldown_hours !== 0) {
    const window = rule.cooldown_hours === -1
      ? "'-100 years'"       // once ever — look back forever
      : `'-${rule.cooldown_hours} hours'`;

    const recent = await db.prepare(
      `SELECT id FROM lifecycle_events
       WHERE customer_id = ? AND type = ? AND created_at > datetime('now', ${window})
       LIMIT 1`
    ).bind(userId, type).first();

    if (recent) {
      console.info(`[LIFECYCLE] Cooldown active for ${type} / user ${userId}`);
      return null;
    }
  }

  // 4. Get or create unsubscribe token for this user
  const unsubToken = await getOrCreateUnsubscribeToken(db, userId, user.email);

  // 5. Build email from template
  const templateFn = TEMPLATE_REGISTRY[rule.template];
  if (!templateFn) {
    console.warn(`[LIFECYCLE] No template function for: ${rule.template}`);
    return null;
  }

  const templateData = {
    first_name:    payload.first_name || user.first_name || null,
    brand_name:    payload.brand_name || null,
    app_url:       APP_URL,
    unsubscribe_url: `https://app.mypilotpost.com/api/unsubscribe?token=${unsubToken}`,
    ...payload,
  };

  let email;
  try {
    email = templateFn(templateData);
  } catch (err) {
    console.error(`[LIFECYCLE] Template render error for ${rule.template}:`, err.message);
    return null;
  }

  // 6. Record lifecycle event
  const eventId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO lifecycle_events (id, customer_id, brand_id, type, payload)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(eventId, userId, brandId, type, JSON.stringify(payload)).run();

  // 7. Queue to email_outbox
  const outboxId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO email_outbox
       (id, customer_id, template, to_email, subject, payload, status, lifecycle_event_id, unsubscribe_token)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(
    outboxId,
    userId,
    rule.template,
    user.email,
    email.subject,
    JSON.stringify({ html: email.html, text: email.text, templateData }),
    eventId,
    unsubToken
  ).run();

  console.info(`[LIFECYCLE] Queued ${type} email to ${user.email} (outbox: ${outboxId})`);
  return outboxId;
}

/**
 * GET /api/unsubscribe?token=xxx
 * Marks the user as globally unsubscribed. Called by the email link.
 */
export async function handleUnsubscribe(request, env) {
  const { json, error } = await import("../../lib/json.js");
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) return error("Missing token", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const row = await db.prepare(
    `SELECT id, user_id FROM email_unsubscribes WHERE token = ?`
  ).bind(token).first();

  if (!row) {
    // Token not found — could be a stale link; just return success silently
    return json({ ok: true, message: "Already unsubscribed or link expired." });
  }

  await db.prepare(
    `UPDATE email_unsubscribes SET categories = 'all', unsubscribed_at = datetime('now') WHERE id = ?`
  ).bind(row.id).run();

  return json({ ok: true, message: "You have been unsubscribed from all myPilotPost emails." });
}

/**
 * POST /api/unsubscribe/category — unsubscribe from a specific category only
 * Body: { token, category }
 */
export async function handleCategoryUnsubscribe(request, env) {
  const { json, error } = await import("../../lib/json.js");
  let body;
  try { body = await request.json(); } catch {
    return error("Invalid JSON", "INVALID_JSON", null, 400);
  }

  const { token, category } = body || {};
  if (!token || !category) return error("token and category required", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const row = await db.prepare(
    `SELECT id, categories FROM email_unsubscribes WHERE token = ?`
  ).bind(token).first();

  if (!row) return error("Invalid token", "NOT_FOUND", null, 404);

  let cats = [];
  try { cats = JSON.parse(row.categories); } catch { cats = []; }
  if (!Array.isArray(cats)) cats = [];
  if (!cats.includes(category)) cats.push(category);

  await db.prepare(
    `UPDATE email_unsubscribes SET categories = ?, unsubscribed_at = datetime('now') WHERE id = ?`
  ).bind(JSON.stringify(cats), row.id).run();

  return json({ ok: true, unsubscribed_from: category });
}

/**
 * GET /api/customer/lifecycle/unsubscribe-status — check current status
 */
export async function getUnsubscribeStatus(request, env, auth) {
  const { json, error } = await import("../../lib/json.js");
  const db = getDB(env);
  const row = await db.prepare(
    `SELECT token, categories, unsubscribed_at FROM email_unsubscribes WHERE user_id = ?`
  ).bind(auth.user_id).first();

  return json({
    subscribed: !row,
    categories: row?.categories || null,
    unsubscribed_at: row?.unsubscribed_at || null,
    token: row?.token || null,
  });
}

/**
 * GET /api/track/open?id=<outbox_id>
 * 1x1 transparent GIF pixel — records opened_at on first hit.
 */
export async function trackEmailOpen(request, env) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const db = getDB(env);
    await db.prepare(
      `UPDATE email_outbox SET opened_at = datetime('now')
       WHERE id = ? AND opened_at IS NULL`
    ).bind(id).run().catch(() => null);
  }

  // 1x1 transparent GIF
  const gif = new Uint8Array([
    0x47,0x49,0x46,0x38,0x39,0x61,0x01,0x00,0x01,0x00,
    0x80,0x00,0x00,0xff,0xff,0xff,0x00,0x00,0x00,0x21,
    0xf9,0x04,0x00,0x00,0x00,0x00,0x00,0x2c,0x00,0x00,
    0x00,0x00,0x01,0x00,0x01,0x00,0x00,0x02,0x02,0x44,
    0x01,0x00,0x3b
  ]);
  return new Response(gif, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * GET /api/track/click?id=<outbox_id>&url=<encoded_url>
 * Records clicked_at and redirects to the original URL.
 */
export async function trackEmailClick(request, env) {
  const url = new URL(request.url);
  const id  = url.searchParams.get("id");
  const dest = url.searchParams.get("url");

  if (id) {
    const db = getDB(env);
    await db.prepare(
      `UPDATE email_outbox SET clicked_at = datetime('now')
       WHERE id = ? AND clicked_at IS NULL`
    ).bind(id).run().catch(() => null);
  }

  const target = dest ? decodeURIComponent(dest) : "https://app.mypilotpost.com";
  return Response.redirect(target, 302);
}

/**
 * GET /api/customer/lifecycle/analytics
 * Returns aggregate email engagement stats for the authenticated user.
 */
export async function getLifecycleAnalytics(request, env, auth) {
  const { json, error } = await import("../../lib/json.js");
  if (!auth?.user_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const db = getDB(env);
  const row = await db.prepare(`
    SELECT
      COUNT(*)                                          AS total_sent,
      SUM(CASE WHEN status = 'sent'        THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN opened_at IS NOT NULL  THEN 1 ELSE 0 END) AS opened,
      SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS clicked,
      SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) AS failed
    FROM email_outbox
    WHERE customer_id = ?
  `).bind(auth.user_id).first();

  return json({
    total_sent:  row?.total_sent  || 0,
    delivered:   row?.delivered   || 0,
    opened:      row?.opened      || 0,
    clicked:     row?.clicked     || 0,
    failed:      row?.failed      || 0,
    open_rate:   row?.delivered   ? Math.round((row.opened  / row.delivered)  * 100) : 0,
    click_rate:  row?.delivered   ? Math.round((row.clicked / row.delivered)  * 100) : 0,
  });
}

async function getOrCreateUnsubscribeToken(db, userId, email) {
  const existing = await db.prepare(
    `SELECT token FROM email_unsubscribes WHERE user_id = ?`
  ).bind(userId).first();

  if (existing) return existing.token;

  // Create a dormant unsubscribe record (not actually unsubscribed, just token provisioned)
  const token = crypto.randomUUID();
  await db.prepare(
    `INSERT OR IGNORE INTO email_unsubscribes (user_id, email, token, categories)
     VALUES (?, ?, ?, '[]')`
  ).bind(userId, email, token).run();

  // Update if it already existed with a different insert (race)
  const row = await db.prepare(
    `SELECT token FROM email_unsubscribes WHERE user_id = ?`
  ).bind(userId).first();

  return row?.token || token;
}
