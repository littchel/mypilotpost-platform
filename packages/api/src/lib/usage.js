// packages/api/src/lib/usage.js

import { PLANS } from "../constants/plans.js";
import { getDB } from "./db.js";

/**
 * Enforce plan limits and feature access
 */
export async function enforceUsage({
  customer,
  action,
  feature,
  env,
}) {
  const planConfig = PLANS[customer.plan];

  if (!planConfig) {
    return forbidden("Unknown plan");
  }

  /* ---------- FEATURE GATING ---------- */
  if (feature && planConfig.features[feature] === false) {
    return forbidden(`Feature not available on ${customer.plan} plan`);
  }

  /* ---------- USAGE LIMIT ---------- */
  if (action) {
    const db = getDB(env);

    const usage = await db
      .prepare(
        `
        SELECT total
        FROM usage_metrics
        WHERE customer_id = ?
        `
      )
      .bind(customer.brandId)
      .first();

    const used = usage?.total || 0;

    if (used >= planConfig.monthly_actions) {
      return limitExceeded(customer.plan);
    }
  }

  return null;
}

/* ---------- RESPONSES ---------- */

function forbidden(message) {
  return new Response(
    JSON.stringify({
      error: "forbidden",
      message,
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

function limitExceeded(plan) {
  return new Response(
    JSON.stringify({
      error: "usage_limit_exceeded",
      plan,
      message: "Monthly usage limit reached",
    }),
    { status: 429, headers: { "Content-Type": "application/json" } }
  );
}
