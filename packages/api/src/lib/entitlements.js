/**
 * Entitlements — authoritative feature + limit resolver.
 *
 * Reads plan_entitlements first; falls back to features_json for plans that
 * pre-date migration 135 or whose entitlements haven't been seeded yet.
 */
import { error } from "./json.js";

/**
 * getEntitlements(db, planId)
 * Returns all entitlements for a plan keyed by feature_key.
 * { social_posts: { enabled:1, limit_value:30, limit_type:'monthly' }, … }
 */
export async function getEntitlements(db, planId) {
  const { results } = await db
    .prepare("SELECT feature_key, enabled, limit_value, limit_type FROM plan_entitlements WHERE plan_id = ?")
    .bind(planId)
    .all();
  const map = {};
  for (const row of results || []) map[row.feature_key] = row;
  return map;
}

/**
 * requireEntitlement(db, userId, featureKey)
 * Returns { allowed: true, limit: null|number } or throws 403 response.
 *
 * Resolution order:
 *   1. plan_entitlements row for (plan_id, featureKey)
 *   2. Fallback: features_json array on the plan row
 */
export async function requireEntitlement(db, userId, featureKey) {
  const row = await db
    .prepare("SELECT u.plan_id, p.features_json FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.id = ?")
    .bind(userId)
    .first();

  const planId = row?.plan_id || "starter";

  // 1. Check plan_entitlements
  const ent = await db
    .prepare("SELECT enabled, limit_value, limit_type FROM plan_entitlements WHERE plan_id = ? AND feature_key = ?")
    .bind(planId, featureKey)
    .first();

  if (ent) {
    if (!ent.enabled) {
      return {
        allowed: false,
        response: error("UPGRADE_REQUIRED", "UPGRADE_REQUIRED", {
          message: `Upgrade your plan to access ${featureKey}`,
          feature: featureKey,
        }, 403),
      };
    }
    return { allowed: true, limit: ent.limit_value ?? null, limit_type: ent.limit_type };
  }

  // 2. Fallback: features_json
  const features = JSON.parse(row?.features_json || "[]");
  if (!features.includes(featureKey)) {
    return {
      allowed: false,
      response: error("UPGRADE_REQUIRED", "UPGRADE_REQUIRED", {
        message: `Upgrade your plan to access ${featureKey}`,
        feature: featureKey,
      }, 403),
    };
  }
  return { allowed: true, limit: null, limit_type: "boolean" };
}

/**
 * getCustomerEntitlementSummary(db, userId)
 * Returns the full entitlement map for a user — used by customer-facing
 * /api/customer/entitlements endpoint.
 */
export async function getCustomerEntitlementSummary(db, userId) {
  const userRow = await db
    .prepare(`
      SELECT u.plan_id, u.subscription_status, u.trial_ends_at,
             p.name as plan_name, p.slug as plan_slug
      FROM users u LEFT JOIN plans p ON p.id = u.plan_id
      WHERE u.id = ?
    `)
    .bind(userId)
    .first();

  const planId = userRow?.plan_id || "starter";
  const entitlements = await getEntitlements(db, planId);

  return {
    plan_id: planId,
    plan_name: userRow?.plan_name || planId,
    plan_slug: userRow?.plan_slug || planId,
    subscription_status: userRow?.subscription_status || "trial",
    trial_ends_at: userRow?.trial_ends_at || null,
    features: entitlements,
  };
}
