import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { resolveCustomerPlan } from "./plan-resolver.js";

/**
 * Enforce usage before allowing action
 */
export function enforceUsage({ metric }) {
  return async (request, env, session) => {
    const db = getDB(env);

    const { limits, is_lifetime } = await resolveCustomerPlan(
      env,
      session.customer_id
    );

    if (is_lifetime) return;

    const usage = await db.prepare(`
      SELECT *
      FROM usage_metrics
      WHERE customer_id = ?
    `)
      .bind(session.customer_id)
      .first();

    const used = usage?.[metric] || 0;
    const limit = limits?.[metric];

    if (limit != null && used >= limit) {
      throw json(
        {
          error: "Plan limit reached",
          metric,
          limit,
        },
        402
      );
    }
  };
}
