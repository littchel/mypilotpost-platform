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

export async function applyBillingEvent(env, { customerId, eventType, amount, planId, currency, billingInterval, checkoutId, paymentId }) {
  const now = new Date().toISOString();
  const interval = billingInterval || "monthly";
  const periodEnd = interval === "annual" || interval === "yearly" ? addOneYear(now) : addOneMonth(now);

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

    // PART 1 — snapshot the agreed price ON the subscription (grandfather lock).
    // locked_price_cents = the actual amount paid; never mutated by later catalog edits.
    await env.DB.prepare(`
      INSERT INTO subscriptions
        (customer_id, status, plan, plan_id, user_id, current_period_start, current_period_end, created_at, updated_at,
         locked_price_cents, locked_currency, billing_interval, effective_from, grandfathered, checkout_id, payment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      customerId, "active", resolvedPlanName, resolvedPlanId, ownerId,
      now, periodEnd, now, now,
      amount ?? null, currency || "USD", interval, now, checkoutId || null, paymentId || null
    ).run();

    // Keep users table in sync — enforcement.js and getCurrentPlan() read from here
    if (ownerId) {
      await env.DB.prepare(`
        UPDATE users SET plan_id = ?, subscription_status = 'active',
          current_period_start = ?, current_period_end = ?
        WHERE id = ?
      `).bind(resolvedPlanId, now, periodEnd, ownerId).run();
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

    // Renewal: refresh period + payment_id. Preserve the existing locked price
    // (grandfathered subscribers keep their original price across renewals).
    // Only set locked price if it was never captured (legacy rows).
    await env.DB.prepare(`
      UPDATE subscriptions
      SET status = 'active',
          plan_id = COALESCE(?, plan_id),
          plan = COALESCE(?, plan),
          current_period_start = ?,
          current_period_end = ?,
          updated_at = ?,
          billing_interval = COALESCE(billing_interval, ?),
          locked_price_cents = COALESCE(locked_price_cents, ?),
          locked_currency = COALESCE(locked_currency, ?),
          effective_from = COALESCE(effective_from, ?),
          payment_id = COALESCE(?, payment_id)
      WHERE customer_id = ?
    `).bind(
      planId, plan?.name || null, now, periodEnd, now,
      interval, amount ?? null, currency || "USD", now, paymentId || null,
      customerId
    ).run();

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

function addOneYear(isoDate) {
  const d = new Date(isoDate);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}
