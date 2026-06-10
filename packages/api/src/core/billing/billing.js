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

  // 1. Paid Subscription (Active & Not Starter)
  if (row.status === 'active' && row.id !== 'starter') {
    return row;
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
 * checkFeatureAccess(request, env, auth, feature)
 * Standardized gate for campaigns, seo, intelligence, reports, white_label
 */
export async function checkFeatureAccess(request, env, auth, feature) {
  const db = getDB(env);
  const plan = await getCurrentPlan(db, auth.user_id);
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
