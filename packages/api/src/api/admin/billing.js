// packages/api/src/api/admin/billing.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { computeRevenueMetrics, computeRevenueTrend } from "../../core/billing/revenue.js";

/**
 * GET /api/v1/admin/billing/overview
 * PART 3 — Rebuilt. ALL money is payment-derived (payments − refunds). No plan math.
 * Subscription/trial counts are OPERATIONAL metrics only, never revenue.
 */
export async function billingOverview(env) {
  const db = getDB(env);

  // Payment-derived revenue (canonical)
  const revenue = await computeRevenueMetrics(env);
  const trend   = await computeRevenueTrend(env, 12);

  // Operational counts (NOT revenue) — kept separate by design
  const ops = await db.prepare(`
    SELECT
      COUNT(*) AS total_users,
      SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) AS active_subs,
      SUM(CASE WHEN subscription_status = 'trial'  THEN 1 ELSE 0 END) AS trial_subs
    FROM users
  `).first();

  return json({
    // ── Revenue (payment-derived) ─────────────────────────────
    currency:               revenue.currency,
    revenue_gross_cents:    revenue.revenue.gross_cents,
    revenue_refunded_cents: revenue.revenue.refunded_cents,
    revenue_net_cents:      revenue.revenue.net_cents,
    mrr_cents:              revenue.mrr_cents,
    arr_cents:              revenue.arr_cents,
    active_revenue_cents:   revenue.active_revenue_cents,
    refund_rate:            revenue.refund_rate,
    payment_success_rate:   revenue.payment_success_rate,
    payment_counts:         revenue.payment_counts,
    arpu_cents:             revenue.arpu_cents,
    revenue_trend:          trend,

    // ── Operational (NOT revenue) ─────────────────────────────
    operational: {
      total_customers:      ops?.total_users || 0,
      active_subscriptions: ops?.active_subs || 0,
      trial_subscriptions:  ops?.trial_subs || 0,
    },

    generated_at: revenue.generated_at,
  });
}

/**
 * GET /api/admin/billing/mrr-history
 */
export async function mrrHistory(env) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT snapshot_month, SUM(mrr) as total_mrr, COUNT(DISTINCT brand_id) as paying_customers
    FROM mrr_snapshots
    GROUP BY snapshot_month
    ORDER BY snapshot_month DESC
    LIMIT 12
  `).all();

  const history = (results || []).map(r => ({
    month: r.snapshot_month,
    mrr: Math.round(r.total_mrr / 100),
    customers: r.paying_customers,
    currency: "ZAR"
  }));

  return json({ history });
}

/**
 * GET /api/v1/admin/billing/payments
 * Admin read-only view of all payments with checkout linkage.
 */
export async function listAdminPayments(env) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT
      p.id, p.brand_id, p.provider, p.provider_event_id,
      p.amount, p.currency, p.status, p.occurred_at, p.created_at,
      p.checkout_id,
      b.name AS brand_name,
      u.email AS owner_email,
      c.plan_id AS checkout_plan_id
    FROM payments p
    JOIN brands b ON b.id = p.brand_id
    JOIN users u  ON u.id = b.owner_user_id
    LEFT JOIN checkouts c ON c.id = p.checkout_id
    ORDER BY p.occurred_at DESC
    LIMIT 200
  `).all();
  return json({ payments: results || [] });
}

/**
 * GET /api/v1/admin/billing/checkouts
 * Admin read-only view of checkout sessions.
 */
export async function listAdminCheckouts(env) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT
      co.id, co.brand_id, co.plan_id, co.billing_interval,
      co.currency, co.localized_price, co.status,
      co.country AS pricing_region,
      co.created_at, co.expires_at, co.completed_at,
      b.name AS brand_name,
      u.email AS owner_email
    FROM checkouts co
    JOIN brands b ON b.id = co.brand_id
    JOIN users u  ON u.id = b.owner_user_id
    ORDER BY co.created_at DESC
    LIMIT 200
  `).all();
  return json({ checkouts: results || [] });
}

/**
 * GET /api/v1/admin/billing/subscriptions
 * Platform-wide subscription list (read-only). Shows the payment-locked price.
 */
export async function listAdminSubscriptions(env) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT
      s.customer_id AS brand_id, s.user_id, s.status,
      s.plan_id, s.plan AS plan_name,
      s.locked_price_cents, s.locked_currency, s.billing_interval,
      s.grandfathered, s.effective_from,
      s.current_period_start, s.current_period_end,
      b.name AS brand_name,
      u.email AS owner_email,
      p.price_cents AS catalog_price_cents, p.currency AS catalog_currency
    FROM subscriptions s
    LEFT JOIN brands b ON b.id = s.customer_id
    LEFT JOIN users  u ON u.id = s.user_id
    LEFT JOIN plans  p ON p.id = s.plan_id
    ORDER BY s.updated_at DESC
    LIMIT 300
  `).all().catch(() => ({ results: [] }));
  return json({ subscriptions: results || [] });
}

/**
 * GET /api/v1/admin/billing/compliance
 * Provider health, tax readiness, invoice readiness, regional pricing coverage.
 * Read-only operational view.
 */
export async function billingCompliance(env) {
  const db = getDB(env);

  // Provider health — Yoco config presence (never echo secrets)
  const provider = {
    name: "yoco",
    api_key_configured:     Boolean(env.YOCO_API_KEY),
    webhook_secret_configured: Boolean(env.YOCO_WEBHOOK_SECRET),
    environment:            env.ENVIRONMENT || "unknown",
    status: Boolean(env.YOCO_API_KEY) ? "operational" : "not_configured",
  };

  // Recent webhook/payment activity as a liveness signal
  const recent = await db.prepare(`
    SELECT
      SUM(CASE WHEN status='succeeded' THEN 1 ELSE 0 END) AS ok,
      SUM(CASE WHEN status='failed'    THEN 1 ELSE 0 END) AS failed,
      MAX(occurred_at) AS last_payment_at
    FROM payments
    WHERE occurred_at > datetime('now','-30 day')
  `).first().catch(() => ({}));

  // Regional pricing coverage
  const { results: regional } = await db.prepare(`
    SELECT region, currency, COUNT(*) AS plans
    FROM regional_plans GROUP BY region, currency ORDER BY region
  `).all().catch(() => ({ results: [] }));

  // Tax + invoice readiness — derived from what exists (honest, not faked)
  const taxConfigured = false; // no tax engine wired yet
  const invoiceTable = await db.prepare(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('invoices','invoice_lines')"
  ).first().catch(() => ({ n: 0 }));

  return json({
    provider,
    activity_30d: {
      payments_succeeded: recent?.ok || 0,
      payments_failed:    recent?.failed || 0,
      last_payment_at:    recent?.last_payment_at || null,
    },
    tax: {
      configured: taxConfigured,
      status: taxConfigured ? "ready" : "not_configured",
      note: "No tax engine wired. Prices are tax-exclusive.",
    },
    invoices: {
      available: (invoiceTable?.n || 0) > 0,
      status: (invoiceTable?.n || 0) > 0 ? "ready" : "not_available",
      note: (invoiceTable?.n || 0) > 0 ? null : "Invoice generation not implemented.",
    },
    regional_pricing: {
      regions: regional || [],
      total_rows: (regional || []).reduce((a, r) => a + (r.plans || 0), 0),
    },
    generated_at: new Date().toISOString(),
  });
}

