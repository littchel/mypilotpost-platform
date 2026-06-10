// packages/api/src/core/billing/subscription-engine.js

import { snapshotMRR, detectChurnSignals } from "./revenue-engine.js";

/**
 * Subscription State Engine
 * Rules-based, deterministic.
 *
 * subscriptions schema (after phase4_admin_compat + 092 + 102):
 *   customer_id TEXT PRIMARY KEY  — brand_id
 *   status TEXT
 *   plan TEXT                     — plan name (display)
 *   plan_id TEXT                  — FK to plans.id
 *   user_id TEXT                  — brand owner user_id (for UI upgrade queries)
 *   current_period_start TEXT
 *   current_period_end TEXT
 *   created_at TEXT
 *   updated_at TEXT
 */

export async function applyBillingEvent(env, { customerId, eventType, amount, planId }) {
  const now = new Date().toISOString();

  /* =========================================================
     1. FETCH CURRENT SUBSCRIPTION
     ========================================================= */
  const subscription = await env.DB.prepare(
    `SELECT * FROM subscriptions WHERE customer_id = ?`
  ).bind(customerId).first();

  /* =========================================================
     2. FIRST PAYMENT → CREATE SUBSCRIPTION
     ========================================================= */
  if (!subscription && eventType === "payment_received") {
    // Resolve brand owner so UI upgrade queries (WHERE user_id) work
    const brand = await env.DB.prepare(
      `SELECT owner_user_id, name FROM brands WHERE id = ?`
    ).bind(customerId).first();

    // Resolve plan name for display
    const plan = planId
      ? await env.DB.prepare(`SELECT name FROM plans WHERE id = ?`).bind(planId).first()
      : null;

    const resolvedPlanName = plan?.name || planId || "starter";
    const resolvedPlanId = planId || "starter";
    const ownerId = brand?.owner_user_id || null;

    await env.DB.prepare(`
      INSERT INTO subscriptions
        (customer_id, status, plan, plan_id, user_id, current_period_start, current_period_end, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customerId, "active", resolvedPlanName, resolvedPlanId, ownerId,
      now, addOneMonth(now), now, now
    ).run();

    // Keep users table in sync — enforcement.js and getCurrentPlan() read from here
    if (ownerId) {
      await env.DB.prepare(`
        UPDATE users SET plan_id = ?, subscription_status = 'active',
          current_period_start = ?, current_period_end = ?
        WHERE id = ?
      `).bind(resolvedPlanId, now, addOneMonth(now), ownerId).run();
    }

    await snapshotMRR(env, customerId, amount);
    await detectChurnSignals(env, customerId, eventType);
    return;
  }

  if (!subscription) return;

  /* =========================================================
     3. PAYMENT RECEIVED → RENEW / REACTIVATE
     ========================================================= */
  if (eventType === "payment_received") {
    const plan = planId
      ? await env.DB.prepare(`SELECT name FROM plans WHERE id = ?`).bind(planId).first()
      : null;

    await env.DB.prepare(`
      UPDATE subscriptions
      SET status = 'active',
          plan_id = COALESCE(?, plan_id),
          plan = COALESCE(?, plan),
          current_period_start = ?,
          current_period_end = ?,
          updated_at = ?
      WHERE customer_id = ?
    `).bind(planId, plan?.name || null, now, addOneMonth(now), now, customerId).run();

    // Sync to users table so enforcement.js and getCurrentPlan() see the new plan
    if (subscription.user_id) {
      await env.DB.prepare(`
        UPDATE users SET plan_id = COALESCE(?, plan_id), subscription_status = 'active',
          current_period_start = ?, current_period_end = ?
        WHERE id = ?
      `).bind(planId, now, addOneMonth(now), subscription.user_id).run();
    }

    await snapshotMRR(env, customerId, amount);
  }

  /* =========================================================
     4. PAYMENT FAILED → PAST_DUE
     ========================================================= */
  if (eventType === "payment_failed" && subscription.status === "active") {
    const updates = [
      env.DB.prepare(`UPDATE subscriptions SET status = 'past_due', updated_at = ? WHERE customer_id = ?`)
        .bind(now, customerId),
    ];
    // Sync to users table so enforcement.js sees past_due and blocks further usage.
    if (subscription.user_id) {
      updates.push(
        env.DB.prepare(`UPDATE users SET subscription_status = 'past_due' WHERE id = ?`)
          .bind(subscription.user_id)
      );
    }
    await env.DB.batch(updates);
  }

  /* =========================================================
     5. REFUND → REVOKE ACCESS
     ========================================================= */
  if (eventType === "refund_received" && subscription) {
    const updates = [
      env.DB.prepare(`UPDATE subscriptions SET status = 'refunded', updated_at = ? WHERE customer_id = ?`)
        .bind(now, customerId),
    ];
    if (subscription.user_id) {
      updates.push(
        env.DB.prepare(`UPDATE users SET subscription_status = 'refunded', plan_id = 'starter' WHERE id = ?`)
          .bind(subscription.user_id)
      );
    }
    await env.DB.batch(updates);
    await detectChurnSignals(env, customerId, eventType);
    return;
  }

  /* =========================================================
     6. CHURN SIGNALS
     ========================================================= */
  await detectChurnSignals(env, customerId, eventType);
}

function addOneMonth(isoDate) {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
