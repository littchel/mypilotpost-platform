import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { resolveCustomerPlan } from "./plan-resolver.js";

/**
 * GET /api/customer/billing
 */
export async function getCustomerBilling(request, env, session) {
  const plan = await resolveCustomerPlan(env, session.customer_id);

  return json({
    plan,
  });
}
