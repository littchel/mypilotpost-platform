// packages/api/src/core/billing/revenue.js
// PART 2 — Canonical revenue engine. ALL money is derived from payments − refunds.
// NEVER from plans × users. Subscription snapshots supply billing_interval only
// (their locked_price_cents is itself payment-derived).
//
// Recognition rules:
//   trial            → 0 revenue (no payment row)
//   failed           → 0 (status != 'succeeded')
//   cancelled        → recognized only until paid period (payment already counted)
//   refund           → subtract refund_amount
//   annual           → normalize to monthly (amount / 12) for MRR
//   expired checkout → ignored (never produced a payment)
//   duplicate webhook→ ignored (payments UNIQUE on provider_event_id)

import { getDB } from "../../lib/db.js";

const REFUND_COUNTED = ["completed", "processing"]; // money that has left / is leaving

/**
 * Lifetime recognized revenue (cents) = succeeded payments − counted refunds.
 */
async function recognizedRevenue(db) {
  const paid = await db.prepare(
    "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'succeeded'"
  ).first();
  const refunded = await db.prepare(
    `SELECT COALESCE(SUM(refund_amount),0) AS total FROM refund_requests WHERE status IN (${REFUND_COUNTED.map(()=>"?").join(",")})`
  ).bind(...REFUND_COUNTED).first();
  return {
    gross: paid?.total || 0,
    refunded: refunded?.total || 0,
    net: (paid?.total || 0) - (refunded?.total || 0),
  };
}

/**
 * MRR (cents) = sum over ACTIVE subscriptions of their payment-derived monthly value.
 * Monthly interval → locked_price_cents; annual → locked_price_cents / 12.
 * Subscriptions whose locked price is null (legacy/no-payment) are excluded —
 * MRR is strictly payment-backed.
 */
async function monthlyRecurringRevenue(db) {
  const { results } = await db.prepare(`
    SELECT locked_price_cents, billing_interval
    FROM subscriptions
    WHERE status = 'active' AND locked_price_cents IS NOT NULL
  `).all();

  let mrr = 0, count = 0;
  for (const s of (results || [])) {
    const cents = s.locked_price_cents || 0;
    const monthly = (s.billing_interval === "annual" || s.billing_interval === "yearly")
      ? Math.round(cents / 12)
      : cents;
    mrr += monthly;
    count += 1;
  }
  return { mrr, active_count: count };
}

/**
 * Active revenue (cents) = succeeded payments from brands with an active subscription,
 * within their current paid period.
 */
async function activeRevenue(db) {
  const row = await db.prepare(`
    SELECT COALESCE(SUM(p.amount),0) AS total
    FROM payments p
    JOIN subscriptions s ON s.customer_id = p.brand_id
    WHERE p.status = 'succeeded'
      AND s.status = 'active'
      AND (s.current_period_start IS NULL OR p.occurred_at >= s.current_period_start)
  `).first();
  return row?.total || 0;
}

/**
 * Payment success rate by count (succeeded / (succeeded + failed)).
 */
async function paymentSuccessRate(db) {
  const row = await db.prepare(`
    SELECT
      SUM(CASE WHEN status='succeeded' THEN 1 ELSE 0 END) AS ok,
      SUM(CASE WHEN status='failed'    THEN 1 ELSE 0 END) AS failed
    FROM payments
  `).first();
  const ok = row?.ok || 0, failed = row?.failed || 0;
  const denom = ok + failed;
  return { rate: denom ? ok / denom : null, succeeded: ok, failed };
}

/**
 * Full revenue snapshot for the Billing overview. All values payment-derived.
 */
export async function computeRevenueMetrics(env) {
  const db = getDB(env);

  const [rev, mrrData, active, success] = await Promise.all([
    recognizedRevenue(db),
    monthlyRecurringRevenue(db),
    activeRevenue(db),
    paymentSuccessRate(db),
  ]);

  const mrr = mrrData.mrr;
  const arr = mrr * 12;
  const refund_rate = rev.gross > 0 ? rev.refunded / rev.gross : 0;
  const arpu = mrrData.active_count > 0 ? Math.round(mrr / mrrData.active_count) : 0;

  // Currency: derive from payments (single-currency platform = USD after catalog reset).
  const curRow = await db.prepare(
    "SELECT currency, COUNT(*) AS n FROM payments WHERE status='succeeded' GROUP BY currency ORDER BY n DESC LIMIT 1"
  ).first().catch(() => null);
  const currency = curRow?.currency || "USD";

  return {
    currency,
    revenue: {
      gross_cents:    rev.gross,
      refunded_cents: rev.refunded,
      net_cents:      rev.net,
    },
    mrr_cents: mrr,
    arr_cents: arr,
    active_revenue_cents: active,
    refund_rate: Number(refund_rate.toFixed(4)),
    payment_success_rate: success.rate === null ? null : Number(success.rate.toFixed(4)),
    payment_counts: { succeeded: success.succeeded, failed: success.failed },
    active_subscriptions: mrrData.active_count,
    arpu_cents: arpu,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Monthly revenue trend from payments − refunds, last `months` calendar months.
 */
export async function computeRevenueTrend(env, months = 12) {
  const db = getDB(env);
  const { results: paid } = await db.prepare(`
    SELECT substr(occurred_at,1,7) AS month, COALESCE(SUM(amount),0) AS gross
    FROM payments WHERE status='succeeded'
    GROUP BY month ORDER BY month DESC LIMIT ?
  `).bind(months).all();
  const { results: refunds } = await db.prepare(`
    SELECT substr(created_at,1,7) AS month, COALESCE(SUM(refund_amount),0) AS refunded
    FROM refund_requests WHERE status IN (${REFUND_COUNTED.map(()=>"?").join(",")})
    GROUP BY month
  `).bind(...REFUND_COUNTED).all().catch(() => ({ results: [] }));

  const refundByMonth = Object.fromEntries((refunds || []).map(r => [r.month, r.refunded]));
  return (paid || []).map(p => ({
    month: p.month,
    gross_cents: p.gross,
    refunded_cents: refundByMonth[p.month] || 0,
    net_cents: p.gross - (refundByMonth[p.month] || 0),
  })).reverse();
}
