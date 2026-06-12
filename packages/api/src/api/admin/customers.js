// packages/api/src/api/admin/customers.js
// All customer-detail sub-endpoints for the Admin Customers tab.
// Owner: Admin domain.

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logAdminAction } from "../../lib/admin_logger.js";
import { computeCustomerHealth } from "../../core/billing/health.js";

// ─── Health summary (Command Center aggregation) ─────────────────────────────

/**
 * GET /api/v1/admin/customers/health-summary
 * Platform-wide health counts using the SAME rules as computeCustomerHealth,
 * evaluated in aggregate SQL. Owner: Customers domain.
 * Buckets: healthy | at_risk | expansion | dormant | churn.
 */
export async function getCustomerHealthSummary(request, env) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT health, COUNT(*) AS n FROM (
      SELECT
        CASE
          WHEN refunds > 0 OR recent_fail > 0 THEN 'churn'
          WHEN days_inactive >= 30 THEN 'dormant'
          WHEN urgent_tickets > 0 OR days_inactive >= 14 THEN 'at_risk'
          WHEN posts_30d >= 8 AND connections >= 2 THEN 'expansion'
          ELSE 'healthy'
        END AS health
      FROM (
        SELECT u.id,
          (SELECT COUNT(*) FROM refund_requests rr JOIN brand_users bu ON bu.brand_id=rr.brand_id
             WHERE bu.user_id=u.id AND rr.status IN ('completed','processing')) AS refunds,
          (SELECT COUNT(*) FROM payments p JOIN brand_users bu ON bu.brand_id=p.brand_id
             WHERE bu.user_id=u.id AND p.status='failed' AND p.occurred_at > datetime('now','-30 day')) AS recent_fail,
          (julianday('now') - julianday(COALESCE(
             (SELECT MAX(created_at) FROM ai_generations WHERE user_id=u.id), u.created_at))) AS days_inactive,
          (SELECT COUNT(*) FROM support_threads st
             WHERE st.customer_id=u.id AND st.priority='urgent' AND st.status NOT IN ('resolved','closed')) AS urgent_tickets,
          (SELECT COUNT(*) FROM growth_activity_log
             WHERE user_id=u.id AND action_type LIKE '%post%' AND created_at > datetime('now','-30 day')) AS posts_30d,
          (SELECT COUNT(*) FROM social_connections sc JOIN brand_users bu ON bu.brand_id=sc.brand_id
             WHERE bu.user_id=u.id AND sc.status='active') AS connections
        FROM users u WHERE u.role='user'
      )
    ) GROUP BY health
  `).all().catch(() => ({ results: [] }));

  const counts = { healthy: 0, at_risk: 0, expansion: 0, dormant: 0, churn: 0 };
  for (const r of (results || [])) if (r.health in counts) counts[r.health] = r.n;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return json({ counts, total, generated_at: new Date().toISOString() });
}

// ─── Profile (extends existing detail) ───────────────────────────────────────

/**
 * GET /api/v1/admin/customers/:id
 * Extends the base users.js detail with trial, onboarding readiness, and full name.
 */
export async function getCustomerProfile(request, env, userId) {
  const db = getDB(env);

  const user = await db.prepare(`
    SELECT
      u.id, u.email, u.first_name, u.last_name, u.role,
      u.plan_id, u.subscription_status, u.is_active,
      u.created_at, u.verified_at, u.trial_ends_at, u.country,
      p.name AS plan_name, p.price_cents, p.currency
    FROM users u
    LEFT JOIN plans p ON p.id = u.plan_id
    WHERE u.id = ?
  `).bind(userId).first();

  if (!user) return error("Customer not found", "NOT_FOUND", null, 404);

  const [brandsRes, aiUsage, supportCount, onboarding] = await Promise.all([
    db.prepare(`
      SELECT b.id, b.name, b.industry, b.logo_url, b.billing_country,
             bu.role AS user_role, b.created_at
      FROM brands b
      JOIN brand_users bu ON bu.brand_id = b.id
      WHERE bu.user_id = ?
      ORDER BY b.created_at ASC
    `).bind(userId).all(),

    db.prepare(
      "SELECT COUNT(*) AS count FROM ai_generations WHERE user_id = ?"
    ).bind(userId).first().catch(() => ({ count: 0 })),

    db.prepare(
      "SELECT COUNT(*) AS count FROM support_messages WHERE sender_id = ?"
    ).bind(userId).first().catch(() => ({ count: 0 })),

    db.prepare(
      "SELECT current_step, completed_at, updated_at FROM onboarding_progress WHERE user_id = ?"
    ).bind(userId).first().catch(() => null),
  ]);

  // Compute onboarding readiness — never read stored onboarding_complete flag
  const TOTAL_STEPS = 9;
  let completion_percent = 0;
  if (onboarding?.completed_at) {
    completion_percent = 100;
  } else if (onboarding?.current_step) {
    completion_percent = Math.round(((onboarding.current_step - 1) / TOTAL_STEPS) * 100);
  }

  return json({
    ...user,
    brands: brandsRes.results || [],
    ai_generations: aiUsage?.count || 0,
    support_messages: supportCount?.count || 0,
    onboarding: {
      completion_percent,
      completed_at: onboarding?.completed_at || null,
      current_step: onboarding?.current_step || 0,
      last_updated: onboarding?.updated_at || null,
    },
  });
}

// ─── PATCH — Extend trial ─────────────────────────────────────────────────────

/**
 * PATCH /api/v1/admin/customers/:id
 * Body: { extend_trial_days: number }
 */
export async function patchCustomer(request, env, userId, auth) {
  const db   = getDB(env);
  const body = await request.json().catch(() => ({}));
  const { extend_trial_days } = body;

  if (!extend_trial_days || typeof extend_trial_days !== "number" || extend_trial_days < 1)
    return error("extend_trial_days must be a positive integer", "BAD_REQUEST", null, 400);

  const user = await db.prepare(
    "SELECT id, email, trial_ends_at, subscription_status FROM users WHERE id = ?"
  ).bind(userId).first();
  if (!user) return error("Customer not found", "NOT_FOUND", null, 404);

  // Base = current trial end or now, whichever is later
  const base    = user.trial_ends_at ? new Date(user.trial_ends_at) : new Date();
  const newEnd  = new Date(Math.max(base.getTime(), Date.now()) + extend_trial_days * 86400000);
  const newEndIso = newEnd.toISOString();

  await db.prepare(
    "UPDATE users SET trial_ends_at = ?, subscription_status = 'trial' WHERE id = ?"
  ).bind(newEndIso, userId).run();

  await logAdminAction(env, auth, "extend_trial", "user", userId, {
    email: user.email, days: extend_trial_days, new_trial_end: newEndIso,
  });

  return json({ success: true, trial_ends_at: newEndIso });
}

// ─── Subscriptions (per brand) ────────────────────────────────────────────────

/**
 * GET /api/v1/admin/customers/:id/subscriptions
 * Returns one entry per brand owned by the user.
 */
export async function getCustomerSubscriptions(request, env, userId) {
  const db = getDB(env);

  // All brands this user owns or is member of
  const { results: brands } = await db.prepare(`
    SELECT b.id AS brand_id, b.name AS brand_name, b.billing_country, b.billing_currency
    FROM brands b
    JOIN brand_users bu ON bu.brand_id = b.id
    WHERE bu.user_id = ?
    ORDER BY b.created_at ASC
  `).bind(userId).all();

  if (!brands?.length) return json({ subscriptions: [] });

  const brandIds = brands.map(b => b.brand_id);
  const placeholders = brandIds.map(() => "?").join(",");

  const [subsRes, paymentsRes, refundsRes] = await Promise.all([
    // Subscription state is canonical on users table (subscriptions table is empty in production)
    db.prepare(`
      SELECT bu.brand_id,
             u.plan_id, u.subscription_status AS status,
             u.trial_ends_at, u.current_period_start, u.current_period_end,
             p.name AS plan_name, p.price_cents, p.currency, p.billing_interval
      FROM brand_users bu
      JOIN users u ON u.id = bu.user_id
      LEFT JOIN plans p ON p.id = u.plan_id
      WHERE bu.brand_id IN (${placeholders}) AND bu.role = 'owner'
    `).bind(...brandIds).all(),

    db.prepare(`
      SELECT brand_id, status, amount, currency, occurred_at, provider, checkout_id
      FROM payments
      WHERE brand_id IN (${placeholders})
      ORDER BY occurred_at DESC
    `).bind(...brandIds).all(),

    db.prepare(`
      SELECT brand_id, status, refund_amount, refund_percent, created_at
      FROM refund_requests
      WHERE brand_id IN (${placeholders})
      ORDER BY created_at DESC
    `).bind(...brandIds).all(),
  ]);

  const subsByBrand   = Object.fromEntries((subsRes.results || []).map(s => [s.brand_id, s]));
  const paysByBrand   = {};
  const refundsByBrand = {};

  for (const p of (paymentsRes.results || [])) {
    if (!paysByBrand[p.brand_id]) paysByBrand[p.brand_id] = [];
    paysByBrand[p.brand_id].push(p);
  }
  for (const r of (refundsRes.results || [])) {
    if (!refundsByBrand[r.brand_id]) refundsByBrand[r.brand_id] = [];
    refundsByBrand[r.brand_id].push(r);
  }

  const subscriptions = brands.map(b => {
    const sub      = subsByBrand[b.brand_id] || null;
    const payments = paysByBrand[b.brand_id] || [];
    const refunds  = refundsByBrand[b.brand_id] || [];
    const lastPay  = payments[0] || null;
    const openRefund = refunds.find(r => ["requested","processing"].includes(r.status)) || null;

    return {
      brand: {
        id:              b.brand_id,
        name:            b.brand_name,
        billing_country: b.billing_country,
        billing_currency: b.billing_currency,
      },
      subscription:  sub,
      plan: sub ? { id: sub.plan_id, name: sub.plan_name, price_cents: sub.price_cents, currency: sub.currency } : null,
      currency:      sub?.currency || b.billing_currency || "ZAR",
      renewal:       sub?.current_period_end || null,
      payment_status: lastPay?.status || null,
      last_payment:  lastPay,
      payments:      payments.slice(0, 10),
      refund_status: openRefund?.status || null,
      refunds:       refunds.slice(0, 5),
    };
  });

  return json({ subscriptions });
}

// ─── Support (customer-scoped) ────────────────────────────────────────────────

/**
 * GET /api/v1/admin/customers/:id/support
 * Returns tickets (support_requests), messages (support_messages), threads.
 */
export async function getCustomerSupport(request, env, userId) {
  const db = getDB(env);

  const [ticketsRes, messagesRes, threadsRes] = await Promise.all([
    // Tickets from support_threads where customer = this user (via brand ownership)
    db.prepare(`
      SELECT st.id, st.status, st.priority, st.created_at, st.closed_at,
             st.assigned_admin_id, b.name AS brand_name
      FROM support_threads st
      JOIN brands b ON b.id = st.brand_id
      WHERE st.customer_id = ?
      ORDER BY st.created_at DESC
      LIMIT 20
    `).bind(userId).all().catch(() => ({ results: [] })),

    // Messages: sent by or received by this user
    db.prepare(`
      SELECT sm.id, sm.thread_id, sm.sender_type, sm.sender_id, sm.receiver_id,
             sm.message, sm.is_admin_msg, sm.read_at, sm.created_at
      FROM support_messages sm
      WHERE sm.sender_id = ? OR sm.receiver_id = ?
      ORDER BY sm.created_at DESC
      LIMIT 50
    `).bind(userId, userId).all().catch(() => ({ results: [] })),

    // Admin notes: admin_audit_logs entries with target = this user for support actions
    db.prepare(`
      SELECT id, admin_id, action, metadata_json, created_at
      FROM admin_audit_logs
      WHERE target_id = ? AND action LIKE '%support%'
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(userId).all().catch(() => ({ results: [] })),
  ]);

  // Normalize messages with direction
  const messages = (messagesRes.results || []).map(m => ({
    ...m,
    direction: m.is_admin_msg ? "outbound" : "inbound",
    delivered: m.read_at ? true : false,
    delivery_status: m.read_at ? "read" : "delivered",
  }));

  return json({
    tickets: ticketsRes.results || [],
    messages,
    notes: (threadsRes.results || []).map(n => ({
      ...n,
      note: (() => { try { return JSON.parse(n.metadata_json)?.notes || null; } catch { return null; } })(),
    })),
  });
}

// ─── Activity (normalized timeline) ──────────────────────────────────────────

/**
 * GET /api/v1/admin/customers/:id/activity
 * Returns a unified timeline: LOGIN, PAYMENT, REFUND, GENERATION, PUBLISH, SUPPORT, BRAND
 */
export async function getCustomerActivity(request, env, userId) {
  const db  = getDB(env);
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 200);

  // Get all brand IDs for this user
  const { results: brandRows } = await db.prepare(
    "SELECT brand_id FROM brand_users WHERE user_id = ?"
  ).bind(userId).all();
  const brandIds = (brandRows || []).map(b => b.brand_id);
  const bPlaceholders = brandIds.length ? brandIds.map(() => "?").join(",") : "'__none__'";

  const [lifecycle, activity, payments, refunds, generations] = await Promise.all([
    // Lifecycle events
    db.prepare(`
      SELECT type, payload, created_at FROM lifecycle_events
      WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50
    `).bind(userId).all().catch(() => ({ results: [] })),

    // Growth activity (publish / engagement actions)
    brandIds.length ? db.prepare(`
      SELECT action_type, content_id, brand_id, points, created_at
      FROM growth_activity_log
      WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).bind(userId).all().catch(() => ({ results: [] })) : Promise.resolve({ results: [] }),

    // Payments
    brandIds.length ? db.prepare(`
      SELECT p.amount, p.currency, p.status, p.occurred_at,
             c.plan_id, b.name AS brand_name
      FROM payments p
      LEFT JOIN checkouts c ON c.id = p.checkout_id
      JOIN brands b ON b.id = p.brand_id
      WHERE p.brand_id IN (${bPlaceholders})
      ORDER BY p.occurred_at DESC LIMIT 20
    `).bind(...brandIds).all().catch(() => ({ results: [] })) : Promise.resolve({ results: [] }),

    // Refunds
    brandIds.length ? db.prepare(`
      SELECT rr.status, rr.refund_amount, rr.refund_percent, rr.created_at,
             b.name AS brand_name
      FROM refund_requests rr
      JOIN brands b ON b.id = rr.brand_id
      WHERE rr.brand_id IN (${bPlaceholders})
      ORDER BY rr.created_at DESC LIMIT 10
    `).bind(...brandIds).all().catch(() => ({ results: [] })) : Promise.resolve({ results: [] }),

    // AI generations (sample)
    db.prepare(`
      SELECT content_type, brand_id, created_at
      FROM ai_generations WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 30
    `).bind(userId).all().catch(() => ({ results: [] })),
  ]);

  const events = [];

  for (const e of (lifecycle.results || [])) {
    let type = "LIFECYCLE", label = e.type.replace(/_/g, " ");
    if (e.type === "user_registered")   { type = "BRAND";   label = "Account created"; }
    else if (e.type === "churn_risk")   { type = "LIFECYCLE"; label = "Churn risk signal"; }
    else if (e.type === "trial_expiring") { type = "LIFECYCLE"; label = "Trial expiring"; }
    let meta = {};
    try { meta = JSON.parse(e.payload || "{}"); } catch {}
    events.push({ type, label, meta, occurred_at: e.created_at });
  }

  for (const a of (activity.results || [])) {
    const type = a.action_type?.includes("post") ? "PUBLISH" : "GENERATION";
    events.push({
      type,
      label: a.action_type?.replace(/_/g, " ") || "Activity",
      meta: { brand_id: a.brand_id, points: a.points, content_id: a.content_id },
      occurred_at: a.created_at,
    });
  }

  for (const p of (payments.results || [])) {
    events.push({
      type: "PAYMENT",
      label: `Payment ${p.status}`,
      meta: { amount: p.amount, currency: p.currency, plan_id: p.plan_id, brand: p.brand_name },
      occurred_at: p.occurred_at,
    });
  }

  for (const r of (refunds.results || [])) {
    events.push({
      type: "REFUND",
      label: `Refund ${r.status}`,
      meta: { amount: r.refund_amount, percent: r.refund_percent, brand: r.brand_name },
      occurred_at: r.created_at,
    });
  }

  for (const g of (generations.results || [])) {
    events.push({
      type: "GENERATION",
      label: `AI generation${g.content_type ? `: ${g.content_type}` : ""}`,
      meta: { brand_id: g.brand_id },
      occurred_at: g.created_at,
    });
  }

  // Sort descending, cap at limit
  events.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  return json({ events: events.slice(0, limit) });
}

// ─── Access ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/customers/:id/access
 * Returns roles, sessions, devices, platforms.
 */
export async function getCustomerAccess(request, env, userId) {
  const db = getDB(env);

  const [rolesRes, sessionsRes, platformsRes] = await Promise.all([
    db.prepare(`
      SELECT bu.brand_id, bu.role, bu.created_at, b.name AS brand_name
      FROM brand_users bu
      JOIN brands b ON b.id = bu.brand_id
      WHERE bu.user_id = ?
      ORDER BY bu.created_at ASC
    `).bind(userId).all().catch(() => ({ results: [] })),

    db.prepare(`
      SELECT id, created_at, expires_at, revoked_at
      FROM sessions
      WHERE user_id = ? AND (revoked_at IS NULL OR revoked_at > datetime('now'))
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(userId).all().catch(() => ({ results: [] })),

    // Social connections via brands this user owns
    db.prepare(`
      SELECT sc.id, sc.platform, sc.platform_username, sc.status,
             sc.created_at, sc.last_refreshed_at, sc.expires_at,
             b.name AS brand_name, sc.brand_id
      FROM social_connections sc
      JOIN brands b ON b.id = sc.brand_id
      JOIN brand_users bu ON bu.brand_id = sc.brand_id
      WHERE bu.user_id = ?
      ORDER BY sc.created_at DESC
    `).bind(userId).all().catch(() => ({ results: [] })),
  ]);

  // Parse device from session (sessions table has no user_agent column — use created_at as device proxy)
  const sessions = (sessionsRes.results || []).map(s => ({
    id:         s.id,
    created_at: s.created_at,
    expires_at: s.expires_at,
    revoked_at: s.revoked_at,
    active:     !s.revoked_at,
    label:      `Session (${s.created_at ? new Date(s.created_at).toLocaleDateString("en-ZA") : "unknown"})`,
  }));

  return json({
    roles:    rolesRes.results || [],
    sessions,
    platforms: platformsRes.results || [],
  });
}

/**
 * DELETE /api/v1/admin/customers/:id/session/:sid
 * Force-revoke a specific session (logout).
 */
export async function revokeCustomerSession(request, env, userId, sessionId, auth) {
  const db = getDB(env);

  const session = await db.prepare(
    "SELECT id, user_id FROM sessions WHERE id = ? AND user_id = ?"
  ).bind(sessionId, userId).first();

  if (!session) return error("Session not found", "NOT_FOUND", null, 404);

  await db.prepare(
    "UPDATE sessions SET revoked_at = datetime('now') WHERE id = ?"
  ).bind(sessionId).run();

  await logAdminAction(env, auth, "revoke_session", "session", sessionId, {
    user_id: userId, session_id: sessionId,
  });

  return json({ success: true });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/customers/:id/lifecycle
 */
export async function getCustomerLifecycle(request, env, userId) {
  const db = getDB(env);

  const [user, onboarding, subRes, eventsRes] = await Promise.all([
    db.prepare(`
      SELECT subscription_status, trial_ends_at, created_at, current_period_start, current_period_end
      FROM users WHERE id = ?
    `).bind(userId).first(),

    db.prepare(
      "SELECT current_step, completed_at, updated_at FROM onboarding_progress WHERE user_id = ?"
    ).bind(userId).first().catch(() => null),

    db.prepare(`
      SELECT s.status, s.plan_id, s.current_period_start, s.current_period_end,
             s.trial_extended_until, p.name AS plan_name
      FROM subscriptions s
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE s.user_id = ?
      LIMIT 1
    `).bind(userId).first().catch(() => null),

    db.prepare(`
      SELECT type, payload, created_at FROM lifecycle_events
      WHERE customer_id = ?
      ORDER BY created_at ASC
      LIMIT 50
    `).bind(userId).all().catch(() => ({ results: [] })),
  ]);

  const TOTAL_STEPS = 9;
  const completion_percent = onboarding?.completed_at ? 100
    : onboarding?.current_step ? Math.round(((onboarding.current_step - 1) / TOTAL_STEPS) * 100) : 0;

  // PART 4 — behavioural health (payments/activity/support/publishing/connections; never plan)
  const health = await computeCustomerHealth(env, userId).catch(() => null);

  return json({
    account: {
      joined_at:            user?.created_at || null,
      subscription_status:  user?.subscription_status || null,
      trial_ends_at:        user?.trial_ends_at || null,
    },
    onboarding: {
      completion_percent,
      completed_at:  onboarding?.completed_at || null,
      current_step:  onboarding?.current_step || 0,
      total_steps:   TOTAL_STEPS,
    },
    subscription: subRes || null,
    health,
    events: (eventsRes.results || []).map(e => {
      let payload = {};
      try { payload = JSON.parse(e.payload || "{}"); } catch {}
      return { type: e.type, payload, occurred_at: e.created_at };
    }),
  });
}

// ─── Audit ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/customers/:id/audit
 * Admin actions targeting this customer only.
 */
export async function getCustomerAudit(request, env, userId) {
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT
      al.id, al.admin_id, al.action, al.target_type, al.target_id,
      al.metadata_json, al.created_at, al.ip_address,
      u.email AS admin_email
    FROM admin_audit_logs al
    LEFT JOIN users u ON u.id = al.admin_id
    WHERE al.target_id = ?
    ORDER BY al.created_at DESC
    LIMIT 50
  `).bind(userId).all().catch(() => ({ results: [] }));

  const entries = (results || []).map(e => {
    let meta = {}, before = null, after = null;
    try { meta = JSON.parse(e.metadata_json || "{}"); } catch {}
    before = meta.before ?? null;
    after  = meta.after ?? meta.new_status ?? meta.days ?? null;
    return {
      id:          e.id,
      who:         e.admin_email || e.admin_id,
      what:        e.action.replace(/_/g, " "),
      target_type: e.target_type,
      before,
      after,
      time:        e.created_at,
      ip:          e.ip_address || null,
    };
  });

  return json({ audit: entries });
}
