// packages/api/src/core/billing/revenue-engine.js

/**
 * Revenue & Churn Engine
 * Rules-based, explainable, admin-only intelligence.
 * NO ML, NO enforcement.
 */

export async function snapshotMRR(env, brandId, amount) {
  const now = new Date();
  const month = now.toISOString().slice(0, 7); // YYYY-MM

  // Schema: mrr_snapshots(customer_id, snapshot_month, mrr, created_at) — no unique constraint,
  // so emulate upsert with delete+insert to keep one row per (customer, month).
  await env.DB.prepare(
    "DELETE FROM mrr_snapshots WHERE customer_id = ? AND snapshot_month = ?"
  ).bind(brandId, month).run();
  await env.DB.prepare(
    "INSERT INTO mrr_snapshots (customer_id, snapshot_month, mrr, created_at) VALUES (?, ?, ?, ?)"
  ).bind(brandId, month, amount, now.toISOString()).run();
}

export async function detectChurnSignals(env, brandId, eventType) {
  const now = new Date().toISOString();

  if (eventType === "payment_failed") {
    await env.DB.prepare(`
      INSERT INTO churn_signals (id, brand_id, signal_type, severity, description, detected_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      brandId,
      "payment_failure",
      4,
      "Recent payment failure detected",
      now
    ).run();
  }

  if (eventType === "payment_received") {
    await env.DB.prepare(`
      UPDATE churn_signals
      SET resolved_at = ?
      WHERE brand_id = ?
        AND signal_type = 'payment_failure'
        AND resolved_at IS NULL
    `).bind(now, brandId).run();
  }
}
