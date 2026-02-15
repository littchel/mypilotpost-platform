// packages/api/src/core/billing/revenue-engine.js

/**
 * Revenue & Churn Engine
 * ----------------------
 * Rules-based, explainable, admin-only intelligence
 * NO ML
 * NO enforcement
 */

export async function snapshotMRR(env, customerId, amount) {
  const now = new Date();
  const month = now.toISOString().slice(0, 7); // YYYY-MM

  await env.DB.prepare(
    `
    INSERT OR REPLACE INTO mrr_snapshots (
      id,
      snapshot_month,
      customer_id,
      mrr,
      created_at
    ) VALUES (?, ?, ?, ?, ?)
    `
  ).bind(
    crypto.randomUUID(),
    month,
    customerId,
    amount,
    now.toISOString()
  ).run();
}

export async function detectChurnSignals(env, customerId, eventType) {
  const now = new Date().toISOString();

  if (eventType === "payment_failed") {
    await env.DB.prepare(
      `
      INSERT INTO churn_signals (
        id,
        customer_id,
        signal_type,
        severity,
        description,
        detected_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      `
    ).bind(
      crypto.randomUUID(),
      customerId,
      "payment_failure",
      4,
      "Recent payment failure detected",
      now
    ).run();
  }

  if (eventType === "payment_received") {
    // Resolve previous payment-related churn signals
    await env.DB.prepare(
      `
      UPDATE churn_signals
      SET resolved_at = ?
      WHERE customer_id = ?
        AND signal_type = 'payment_failure'
        AND resolved_at IS NULL
      `
    ).bind(now, customerId).run();
  }
}
