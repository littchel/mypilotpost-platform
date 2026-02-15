// packages/api/src/core/billing/subscription-engine.js

import { snapshotMRR, detectChurnSignals } from "./revenue-engine.js";

/**
 * Subscription State Engine
 * -------------------------
 * Rules-based, deterministic, explainable
 * - NO ML
 * - NO hard enforcement
 * - Admin-grade only
 *
 * This engine:
 * - Owns subscription lifecycle
 * - Reacts ONLY to billing events
 * - Writes no money facts (payments)
 */

export async function applyBillingEvent(
  env,
  {
    customerId,
    eventType, // 'payment_received' | 'payment_failed'
    amount,
  }
) {
  const now = new Date().toISOString();

  /* =====================================================
     1️⃣ FETCH CURRENT SUBSCRIPTION (IF ANY)
     ===================================================== */
  const subscription = await env.DB.prepare(
    `SELECT * FROM subscriptions WHERE customer_id = ?`
  )
    .bind(customerId)
    .first();

  /* =====================================================
     2️⃣ FIRST PAYMENT → CREATE SUBSCRIPTION
     ===================================================== */
  if (!subscription && eventType === "payment_received") {
    await env.DB.prepare(
      `
      INSERT INTO subscriptions (
        id,
        customer_id,
        plan,
        status,
        started_at,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).bind(
      crypto.randomUUID(),
      customerId,
      "default",          // plan enforcement comes later
      "active",
      now,
      now,
      addOneMonth(now),
      now,
      now
    ).run();

    // Revenue + churn intelligence
    await snapshotMRR(env, customerId, amount);
    await detectChurnSignals(env, customerId, eventType);

    return;
  }

  if (!subscription) {
    // No subscription + non-payment_received event → nothing to do
    return;
  }

  /* =====================================================
     3️⃣ PAYMENT RECEIVED → ACTIVATE / RENEW
     ===================================================== */
  if (eventType === "payment_received") {
    await env.DB.prepare(
      `
      UPDATE subscriptions
      SET status = 'active',
          current_period_start = ?,
          current_period_end = ?,
          updated_at = ?
      WHERE id = ?
      `
    ).bind(
      now,
      addOneMonth(now),
      now,
      subscription.id
    ).run();

    await snapshotMRR(env, customerId, amount);
  }

  /* =====================================================
     4️⃣ PAYMENT FAILED → MOVE TO PAST_DUE
     ===================================================== */
  if (eventType === "payment_failed") {
    if (subscription.status === "active") {
      await env.DB.prepare(
        `
        UPDATE subscriptions
        SET status = 'past_due',
            updated_at = ?
        WHERE id = ?
        `
      ).bind(now, subscription.id).run();
    }
  }

  /* =====================================================
     5️⃣ CHURN SIGNAL DETECTION / RESOLUTION
     ===================================================== */
  await detectChurnSignals(env, customerId, eventType);
}

/* =====================================================
   HELPERS
   ===================================================== */

function addOneMonth(isoDate) {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
