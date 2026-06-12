// packages/api/src/core/billing/billing.js
import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * getCurrentPlan(userId)
 * Authoritative plan resolution with snapshot fallback
 */
export async function getCurrentPlan(db, userId) {
  const row = await db.prepare(`
    SELECT u.subscription_status as status, u.trial_ends_at, u.plan_id, p.*
    FROM users u
    JOIN plans p ON u.plan_id = p.id
    WHERE u.id = ?
  `).bind(userId).first();

  if (!row) {
    const starter = await db.prepare("SELECT * FROM plans WHERE id = 'starter'").first();
    return { ...starter, status: 'trial', trial_ends_at: null };
  }

  const now = new Date();

  // 1. Paid Subscription (Active & Not Starter) — apply price-lock resolution.
  if (row.status === 'active' && row.id !== 'starter') {
    return await applyPriceResolution(db, userId, row);
  }

  // 2. Standard Trial (includes referral-extended trial — stored in users.trial_ends_at)
  if (row.status === 'trial' && row.trial_ends_at && new Date(row.trial_ends_at) > now) {
    return row;
  }

  // 4. Trial Expired Fallback (Starter)
  if (row.id !== 'starter') {
    const starter = await db.prepare("SELECT * FROM plans WHERE id = 'starter'").first();
    return { ...starter, status: 'trial_expired', original_plan: row.name };
  }

  return row;
}

/**
 * Price-lock resolution: a subscriber pays the price they agreed to, not the live
 * catalog price. Resolution order:
 *   1. subscriptions.locked_price_cents (grandfathered snapshot)
 *   2. latest paid checkout snapshot (checkouts.localized_price)
 *   3. live plan catalog (planRow as-is)
 * Returns the plan row with price fields overridden + price_source for transparency.
 */
async function applyPriceResolution(db, userId, planRow) {
  // 1. Subscription snapshot
  const sub = await db.prepare(`
    SELECT locked_price_cents, locked_currency, billing_interval, grandfathered, effective_from
    FROM subscriptions
    WHERE user_id = ? AND status = 'active' AND locked_price_cents IS NOT NULL
    ORDER BY effective_from DESC LIMIT 1
  `).bind(userId).first().catch(() => null);

  if (sub?.locked_price_cents != null) {
    return {
      ...planRow,
      price_cents:   sub.locked_price_cents,
      price_monthly: Math.round(sub.locked_price_cents / 100),
      currency:      sub.locked_currency || planRow.currency,
      billing_interval: sub.billing_interval || 'monthly',
      grandfathered: !!sub.grandfathered,
      price_source:  'subscription_locked',
      effective_from: sub.effective_from || null,
    };
  }

  // 2. Latest paid checkout snapshot
  const checkout = await db.prepare(`
    SELECT c.localized_price, c.currency, c.billing_interval
    FROM checkouts c
    JOIN brands b ON b.id = c.brand_id
    WHERE b.owner_user_id = ? AND c.status = 'paid' AND c.localized_price IS NOT NULL
    ORDER BY c.completed_at DESC LIMIT 1
  `).bind(userId).first().catch(() => null);

  if (checkout?.localized_price != null) {
    return {
      ...planRow,
      price_cents:   checkout.localized_price,
      price_monthly: Math.round(checkout.localized_price / 100),
      currency:      checkout.currency || planRow.currency,
      billing_interval: checkout.billing_interval || 'monthly',
      price_source:  'checkout_snapshot',
    };
  }

  // 3. Live catalog fallback
  return { ...planRow, price_source: 'catalog' };
}

/**
 * checkFeatureAccess(request, env, auth, feature)
 * Standardized gate for campaigns, seo, intelligence, reports, white_label.
 * Reads plan_entitlements first; falls back to features_json for backward compat.
 */
export async function checkFeatureAccess(request, env, auth, feature) {
  const db = getDB(env);
  const plan = await getCurrentPlan(db, auth.user_id);

  // 1. plan_entitlements (new authoritative source)
  const ent = await db.prepare(
    "SELECT enabled FROM plan_entitlements WHERE plan_id = ? AND feature_key = ?"
  ).bind(plan.id, feature).first().catch(() => null);

  if (ent !== null && ent !== undefined) {
    if (!ent.enabled) {
      return {
        allowed: false,
        response: error("UPGRADE_REQUIRED", "UPGRADE_REQUIRED", {
          message: `Upgrade your plan to access ${feature.toUpperCase()}`,
          feature
        }, 403)
      };
    }
    return { allowed: true };
  }

  // 2. Fallback: features_json
  const allowedFeatures = JSON.parse(plan.features_json || '[]');
  if (!allowedFeatures.includes(feature)) {
    return {
      allowed: false,
      response: error("UPGRADE_REQUIRED", "UPGRADE_REQUIRED", {
        message: `Upgrade your plan to access ${feature.toUpperCase()}`,
        feature
      }, 403)
    };
  }
  return { allowed: true };
}

/**
 * enforceLimits(userId, action)
 * Atomic check against usage snapshots
 */
export async function enforceLimits(db, userId, action) {
  const plan = await getCurrentPlan(db, userId);
  const snapshot = await db.prepare(`
    SELECT brands_count, active_users_count FROM usage_snapshots WHERE user_id = ?
  `).bind(userId).first();

  const usage = snapshot || { brands_count: 0, active_users_count: 0 };

  if (action === 'brand' && usage.brands_count >= plan.brand_limit) {
    return {
      allowed: false,
      message: `Limit reached. Your ${plan.name} plan supports up to ${plan.brand_limit} brand${plan.brand_limit > 1 ? 's' : ''}.`
    };
  }

  if (action === 'user' && usage.active_users_count >= plan.user_limit) {
    return {
      allowed: false,
      message: `User limit reached. Your ${plan.name} plan supports up to ${plan.user_limit} user seats.`
    };
  }

  return { allowed: true };
}

/**
 * recalculateUsage(db, userId)
 * Real-time snapshot refresh triggered by lifecycle events
 */
export async function recalculateUsage(db, userId) {
  // 1. Count distinct active brands owned by user
  const brandsRow = await db.prepare(`SELECT COUNT(*) as count FROM brands WHERE owner_user_id = ?`).bind(userId).first();
  
  // 2. Count distinct unique team members across all brands owned by user
  // (Filter by verified_at to only count active users)
  const usersRow = await db.prepare(`
    SELECT COUNT(DISTINCT bu.user_id) as count
    FROM brand_users bu
    JOIN brands b ON bu.brand_id = b.id
    JOIN users u ON u.id = bu.user_id
    WHERE b.owner_user_id = ? AND u.verified_at IS NOT NULL
  `).bind(userId).first();

  await db.prepare(`
    INSERT INTO usage_snapshots (user_id, brands_count, active_users_count, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      brands_count = excluded.brands_count,
      active_users_count = excluded.active_users_count,
      updated_at = excluded.updated_at
  `).bind(userId, brandsRow?.count || 0, usersRow?.count || 0).run();
}

/**
 * updateSubscription(db, userId, newPlanId)
 * Single transaction plan switch with audit trail
 */
export async function updateSubscription(db, userId, newPlanId) {
  const current = await db.prepare("SELECT plan_id FROM subscriptions WHERE user_id = ?").bind(userId).first();
  const eventId = crypto.randomUUID();

  // Update both subscriptions AND users so that enforcement.js and getCurrentPlan()
  // (which read from users) see the new plan immediately.
  await db.batch([
    db.prepare(`
      UPDATE subscriptions
      SET plan_id = ?, status = 'active', updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(newPlanId, userId),
    db.prepare(`
      UPDATE users
      SET plan_id = ?, subscription_status = 'active'
      WHERE id = ?
    `).bind(newPlanId, userId),
    db.prepare(`
      INSERT INTO subscription_events (id, user_id, old_plan_id, new_plan_id, event_type)
      VALUES (?, ?, ?, ?, 'upgrade')
    `).bind(eventId, userId, current?.plan_id || null, newPlanId)
  ]);
}
