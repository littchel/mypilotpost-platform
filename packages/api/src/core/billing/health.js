// packages/api/src/core/billing/health.js
// PART 4 — Customer health (Customers → Lifecycle).
// Inputs: payments, activity, support, publishing, connections. NEVER the plan.
// Outputs: Healthy | At Risk | Dormant | Expansion | Churn

import { getDB } from "../../lib/db.js";

const DAY = 86400000;

/**
 * Classify a customer's health from behavioural + financial signals.
 * @returns {{status, score, signals, reasons}}
 */
export async function computeCustomerHealth(env, userId) {
  const db = getDB(env);

  // Brand scope
  const { results: brandRows } = await db.prepare(
    "SELECT brand_id FROM brand_users WHERE user_id = ?"
  ).bind(userId).all();
  const brandIds = (brandRows || []).map(b => b.brand_id);
  const ph = brandIds.length ? brandIds.map(() => "?").join(",") : "''";

  const [pay, refund, lastActivity, support, publishing, connections] = await Promise.all([
    // payments — last successful payment recency + failures
    brandIds.length ? db.prepare(`
      SELECT
        MAX(CASE WHEN status='succeeded' THEN occurred_at END) AS last_paid,
        SUM(CASE WHEN status='failed' AND occurred_at > datetime('now','-30 day') THEN 1 ELSE 0 END) AS recent_failures
      FROM payments WHERE brand_id IN (${ph})
    `).bind(...brandIds).first().catch(() => ({})) : Promise.resolve({}),

    // refunds — any recent refund = churn signal
    brandIds.length ? db.prepare(`
      SELECT COUNT(*) AS n FROM refund_requests
      WHERE brand_id IN (${ph}) AND status IN ('completed','processing')
    `).bind(...brandIds).first().catch(() => ({ n: 0 })) : Promise.resolve({ n: 0 }),

    // activity — last login / generation / growth action
    db.prepare(`
      SELECT MAX(ts) AS last_seen FROM (
        SELECT MAX(created_at) AS ts FROM ai_generations WHERE user_id = ?
        UNION ALL SELECT MAX(created_at) FROM growth_activity_log WHERE user_id = ?
        UNION ALL SELECT MAX(created_at) FROM lifecycle_events WHERE customer_id = ?
      )
    `).bind(userId, userId, userId).first().catch(() => ({})),

    // support — open / urgent tickets
    db.prepare(`
      SELECT
        SUM(CASE WHEN status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS open_tickets,
        SUM(CASE WHEN priority='urgent' AND status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS urgent_open
      FROM support_threads WHERE customer_id = ?
    `).bind(userId).first().catch(() => ({ open_tickets: 0, urgent_open: 0 })),

    // publishing — recent published content
    brandIds.length ? db.prepare(`
      SELECT COUNT(*) AS n FROM growth_activity_log
      WHERE user_id = ? AND action_type LIKE '%post%' AND created_at > datetime('now','-30 day')
    `).bind(userId).first().catch(() => ({ n: 0 })) : Promise.resolve({ n: 0 }),

    // connections — active social connections
    brandIds.length ? db.prepare(`
      SELECT COUNT(*) AS n FROM social_connections
      WHERE brand_id IN (${ph}) AND status = 'active'
    `).bind(...brandIds).first().catch(() => ({ n: 0 })) : Promise.resolve({ n: 0 }),
  ]);

  const now = Date.now();
  const lastSeen = lastActivity?.last_seen ? new Date(lastActivity.last_seen).getTime() : 0;
  const daysSinceActivity = lastSeen ? Math.floor((now - lastSeen) / DAY) : 999;
  const lastPaid = pay?.last_paid ? new Date(pay.last_paid).getTime() : 0;
  const daysSincePaid = lastPaid ? Math.floor((now - lastPaid) / DAY) : null;

  const signals = {
    days_since_activity: daysSinceActivity,
    days_since_payment:  daysSincePaid,
    recent_payment_failures: pay?.recent_failures || 0,
    refunds: refund?.n || 0,
    open_tickets: support?.open_tickets || 0,
    urgent_tickets: support?.urgent_open || 0,
    posts_30d: publishing?.n || 0,
    active_connections: connections?.n || 0,
  };

  // Classification — first match wins (most severe first)
  const reasons = [];
  let status;

  if (signals.refunds > 0) {
    status = "Churn"; reasons.push("refund issued");
  } else if (signals.recent_payment_failures > 0) {
    status = "Churn"; reasons.push("recent payment failure");
  } else if (daysSinceActivity >= 30) {
    status = "Dormant"; reasons.push(`no activity in ${daysSinceActivity}d`);
  } else if (signals.urgent_tickets > 0) {
    status = "At Risk"; reasons.push("urgent support ticket open");
  } else if (daysSinceActivity >= 14) {
    status = "At Risk"; reasons.push(`low activity (${daysSinceActivity}d)`);
  } else if (signals.posts_30d >= 8 && signals.active_connections >= 2) {
    status = "Expansion"; reasons.push("high publishing + multi-platform — upsell candidate");
  } else {
    status = "Healthy"; reasons.push("active and engaged");
  }

  // Score 0-100 (transparency)
  let score = 50;
  if (signals.refunds === 0) score += 10;
  if (signals.recent_payment_failures === 0) score += 10;
  score += Math.max(-25, Math.min(20, (14 - daysSinceActivity)));
  score += Math.min(15, signals.posts_30d);
  score += Math.min(10, signals.active_connections * 3);
  score -= signals.urgent_tickets * 10;
  score = Math.max(0, Math.min(100, score));

  return { status, score, signals, reasons };
}
