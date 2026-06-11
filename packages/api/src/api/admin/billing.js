// packages/api/src/api/admin/billing.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/admin/billing/overview
 */
export async function billingOverview(env) {
  const db = getDB(env);

  // 1. Total Active Customers (Active or Trial)
  const stats = await db.prepare(`
    SELECT 
      COUNT(*) AS total_users,
      SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active_subs,
      SUM(CASE WHEN subscription_status = 'trial' THEN 1 ELSE 0 END) as trial_subs
    FROM users
  `).first();

  // 2. Calculate Correct MRR — use price_cents (canonical cents column)
  // Fall back to price_monthly * 100 for plans created before price_cents was added
  const mrrRow = await db.prepare(`
    SELECT SUM(COALESCE(p.price_cents, p.price_monthly * 100, 0)) as total_mrr_cents
    FROM users u
    JOIN plans p ON u.plan_id = p.id
    WHERE u.subscription_status = 'active'
  `).first();

  // 3. Plan Distribution
  const { results: distribution } = await db.prepare(`
    SELECT p.name, COUNT(u.id) as count
    FROM users u
    JOIN plans p ON u.plan_id = p.id
    GROUP BY p.name
  `).all();

  // 4. Audit Conversion (Simplified)
  const auditConversion = await db.prepare(`
    SELECT 
      (SELECT COUNT(DISTINCT brand_id) FROM brand_audit_results) as total_audits,
      (SELECT COUNT(*) FROM users WHERE subscription_status = 'active') as active_users
  `).first();

  return json({
    total_customers: stats?.total_users || 0,
    active_subscriptions: stats?.active_subs || 0,
    trial_subscriptions: stats?.trial_subs || 0,
    mrr: mrrRow?.total_mrr_cents || 0,
    currency: "ZAR",
    distribution,
    conversion_rate: auditConversion.total_audits > 0 ? (auditConversion.active_users / auditConversion.total_audits * 100).toFixed(1) + "%" : "0%"
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

