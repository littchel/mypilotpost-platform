// packages/api/src/core/billing/enforcement.js
/**
 * myPilotPost — SaaS ENFORCEMENT ENGINE
 * ATOMIC • SELF-HEALING • AUTHORITATIVE
 */

import { error } from "../../lib/json.js";

// Default plan limits used when plan row is missing (self-healing fallback)
const DEFAULT_PLAN_LIMITS = {
  social_accounts_limit: 3,
  posts_per_month_limit: 30,
  ai_generations_limit: 10
};

const LIMIT_MAP = {
  posts: "posts_per_month_limit",
  ai: "ai_generations_limit",
  accounts: "social_accounts_limit"
};

const USAGE_COL_MAP = {
  posts: "posts_used",
  ai: "ai_generations_used",
  accounts: "social_accounts_used"
};

/**
 * checkAndIncrement(db, userId, action)
 * The main enforcement hook.
 */
export async function checkAndIncrement(db, userId, action) {
  const now = new Date().toISOString();
  
  // 1. Fetch User + Plan + Usage in one go (LEFT JOIN plans for self-healing)
  let data = await db.prepare(`
    SELECT 
      u.plan_id, u.subscription_status, u.trial_ends_at, u.current_period_end,
      p.social_accounts_limit, p.posts_per_month_limit, p.ai_generations_limit,
      t.posts_used, t.ai_generations_used, t.social_accounts_used
    FROM users u
    LEFT JOIN plans p ON u.plan_id = p.id
    LEFT JOIN usage_tracking t ON u.id = t.user_id
    WHERE u.id = ?
  `).bind(userId).first();

  if (!data) throw new Error("User not found");

  // Self-healing: apply starter defaults when plan row is missing
  if (data.ai_generations_limit == null) {
    data = { ...data, ...DEFAULT_PLAN_LIMITS };
  }

  // Self-healing: if usage_tracking row is missing, create it and treat as zero
  if (data.posts_used == null) {
    const start = now.slice(0, 10);
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.prepare(`INSERT OR IGNORE INTO usage_tracking (user_id, period_start, period_end) VALUES (?, ?, ?)`)
      .bind(userId, start, end).run();
    data = { ...data, posts_used: 0, ai_generations_used: 0, social_accounts_used: 0 };
  }

  // 2. Self-Healing: Initialize or reset billing period
  if (!data.current_period_end) {
    // New user — initialize a 30-day period from today
    const start = now.slice(0, 10);
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.prepare(`UPDATE users SET current_period_start = ?, current_period_end = ? WHERE id = ?`)
      .bind(start, end, userId).run();
    // Continue with zeroed usage — don't recurse
  } else if (now > data.current_period_end) {
    await resetUsagePeriod(db, userId, data.current_period_end);
    return checkAndIncrement(db, userId, action);
  }

  // 3. Logic: Trial Expiry
  if (data.subscription_status === 'trial' && now > data.trial_ends_at) {
    await db.prepare("UPDATE users SET subscription_status = 'expired' WHERE id = ?").bind(userId).run();
    return throwLimitError(data, action, "Trial Expired", "expired");
  }

  // 4. Logic: Block if Expired or Cancelled
  if (data.subscription_status === 'expired' || data.subscription_status === 'cancelled') {
    return throwLimitError(data, action, "Subscription inactive", data.subscription_status);
  }

  // 5. Logic: Enforcement
  const limitKey = LIMIT_MAP[action];
  const usageKey = USAGE_COL_MAP[action];
  
  if (!limitKey || !usageKey) throw new Error(`Invalid enforcement action: ${action}`);

  const limit = data[limitKey];
  const used = data[usageKey] || 0;

  if (used >= limit) {
    return throwLimitError(data, action, "Limit reached", "limit_reached");
  }

  // 6. Atomic Increment — explicit column map avoids SQL template injection
  const INCREMENT_SQL = {
    posts:    "UPDATE usage_tracking SET posts_used = posts_used + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
    ai:       "UPDATE usage_tracking SET ai_generations_used = ai_generations_used + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
    accounts: "UPDATE usage_tracking SET social_accounts_used = social_accounts_used + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
  };
  await db.prepare(INCREMENT_SQL[action]).bind(userId).run();

  return { success: true, remaining: limit - (used + 1) };
}

/**
 * resetUsagePeriod(db, userId, lastEnd)
 * Calculates next period and resets counters.
 */
async function resetUsagePeriod(db, userId, lastEnd) {
  const newStart = lastEnd;
  const newEnd = new Date(new Date(lastEnd).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.batch([
    db.prepare(`
      UPDATE users 
      SET current_period_start = ?, current_period_end = ?
      WHERE id = ?
    `).bind(newStart, newEnd, userId),
    db.prepare(`
      UPDATE usage_tracking 
      SET posts_used = 0, ai_generations_used = 0, period_start = ?, period_end = ?
      WHERE user_id = ?
    `).bind(newStart, newEnd, userId)
  ]);
}

/**
 * throwLimitError
 */
function throwLimitError(data, action, message, status) {
  const limitKey = LIMIT_MAP[action];
  const usageKey = USAGE_COL_MAP[action];
  
  // Deterministic recommendation
  let recommended = "growth";
  if (data.plan_id === 'growth') recommended = "pro";

  throw error(message, "UPGRADE_REQUIRED", {
    current_plan: data.plan_id,
    subscription_status: status,
    limit_type: action,
    limit: data[limitKey],
    used: data[usageKey] || 0,
    recommended_plan: recommended
  }, 403);
}
