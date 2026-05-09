// packages/api/src/api/admin/billing.js

import { json } from "../../lib/json.js";
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

  // 2. Calculate Correct MRR (Only Active, non-trial)
  const mrrRow = await db.prepare(`
    SELECT SUM(p.price_monthly) as total_mrr
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
    mrr: (mrrRow?.total_mrr || 0) / 100, // Convert cents to dollars
    currency: "ZAR",
    distribution,
    conversion_rate: auditConversion.total_audits > 0 ? (auditConversion.active_users / auditConversion.total_audits * 100).toFixed(1) + "%" : "0%"
  });
}

/**
 * GET /api/admin/billing/mrr-history
 */
export async function mrrHistory() {
  // Phase 1: no historical billing yet
  return json({ history: [] });
}
