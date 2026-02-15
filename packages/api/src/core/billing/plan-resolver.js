import { getDB } from "../../lib/db.js";

/**
 * Resolve effective plan + limits for a customer
 */
export async function resolveCustomerPlan(env, customerId) {
  const db = getDB(env);

  const plan = await db.prepare(`
    SELECT
      p.id,
      p.name,
      p.limits,
      cp.is_lifetime
    FROM customer_plans cp
    JOIN plans p ON p.id = cp.plan_id
    WHERE cp.customer_id = ?
      AND cp.status = 'active'
    ORDER BY cp.created_at DESC
    LIMIT 1
  `)
    .bind(customerId)
    .first();

  if (!plan) {
    return {
      plan: "free",
      limits: {},
      is_lifetime: false,
    };
  }

  return {
    plan: plan.name,
    limits: JSON.parse(plan.limits),
    is_lifetime: !!plan.is_lifetime,
  };
}
