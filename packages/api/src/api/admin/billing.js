// packages/api/src/api/admin/billing.js

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/admin/billing/overview
 */
export async function billingOverview(env) {
  const db = getDB(env);

  const totalCustomers = await db
    .prepare(`SELECT COUNT(*) AS count FROM users`)
    .first();

  return json({
    total_customers: totalCustomers?.count || 0,
    mrr: 0,
    currency: "USD",
  });
}

/**
 * GET /api/admin/billing/mrr-history
 */
export async function mrrHistory() {
  // Phase 1: no historical billing yet
  return json([]);
}
