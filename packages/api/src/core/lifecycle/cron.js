// packages/api/src/core/lifecycle/cron.js
// Daily lifecycle cron runner. Triggered by the `0 3 * * *` Cloudflare cron.
// Each function queries eligible users and calls triggerLifecycleEmail().
// All functions are fail-soft — one user failing does not stop the batch.

import { getDB } from "../../lib/db.js";
import { triggerLifecycleEmail } from "./engine.js";
import { processPendingDeletions } from "../../api/customer/compliance.js";

/**
 * Master cron entry point. Called from server.js scheduled handler.
 */
export async function runLifecycleCron(env) {
  console.log("[LIFECYCLE-CRON] Starting daily lifecycle run");

  await Promise.allSettled([
    runTrialExpiryEmails(env),
    runChurnRiskEmails(env),
    runWeeklyDigestEmails(env),
    runOnboardingReminderEmails(env),
    processPendingDeletions(env),
  ]);

  console.log("[LIFECYCLE-CRON] Daily lifecycle run complete");
}

/**
 * Trial expiry — users whose trial ends within 3 days.
 * Requires subscriptions.current_period_end column (migration 092).
 */
async function runTrialExpiryEmails(env) {
  const db = getDB(env);

  // Query users table directly — users.subscription_status and trial_ends_at are
  // the authoritative trial state (seeded at registration, synced on payment).
  // subscriptions.plan_id = 'trial' never matched any row (no plan with that id).
  const { results } = await db.prepare(`
    SELECT DISTINCT u.id as user_id, u.first_name, u.email,
                    b.id as brand_id, b.name as brand_name,
                    u.trial_ends_at as current_period_end
    FROM users u
    JOIN brand_users bu ON bu.user_id = u.id
    JOIN brands b ON b.id = bu.brand_id
    WHERE u.subscription_status = 'trial'
      AND u.trial_ends_at IS NOT NULL
      AND u.trial_ends_at <= datetime('now', '+3 days')
      AND u.trial_ends_at > datetime('now')
    LIMIT 100
  `).all();

  let sent = 0;
  for (const row of results || []) {
    try {
      const result = await triggerLifecycleEmail(env, {
        userId: row.user_id,
        brandId: row.brand_id,
        type: "trial_expiring",
        payload: {
          first_name: row.first_name,
          brand_name: row.brand_name,
          trial_end: row.current_period_end,
        }
      });
      if (result) sent++;
    } catch (err) {
      console.error(`[LIFECYCLE-CRON] trial_expiring failed for ${row.user_id}:`, err.message);
    }
  }

  console.log(`[LIFECYCLE-CRON] trial_expiring: ${sent}/${(results || []).length} queued`);
}

/**
 * Churn risk — users with no content activity in 7+ days.
 */
async function runChurnRiskEmails(env) {
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT DISTINCT u.id as user_id, u.first_name, u.email,
                    b.id as brand_id, b.name as brand_name,
                    MAX(c.created_at) as last_activity
    FROM users u
    JOIN brand_users bu ON bu.user_id = u.id
    JOIN brands b ON b.id = bu.brand_id
    LEFT JOIN content_drafts c ON c.brand_id = b.id
    WHERE u.verified_at IS NOT NULL
    GROUP BY u.id, b.id
    HAVING last_activity IS NULL OR last_activity < datetime('now', '-7 days')
    LIMIT 200
  `).all();

  let sent = 0;
  for (const row of results || []) {
    try {
      const daysSince = row.last_activity
        ? Math.floor((Date.now() - new Date(row.last_activity).getTime()) / 86400000)
        : 14;

      const result = await triggerLifecycleEmail(env, {
        userId: row.user_id,
        brandId: row.brand_id,
        type: "churn_risk",
        payload: {
          first_name: row.first_name,
          brand_name: row.brand_name,
          days_inactive: daysSince,
        }
      });
      if (result) sent++;
    } catch (err) {
      console.error(`[LIFECYCLE-CRON] churn_risk failed for ${row.user_id}:`, err.message);
    }
  }

  console.log(`[LIFECYCLE-CRON] churn_risk: ${sent}/${(results || []).length} queued`);
}

/**
 * Weekly digest — all verified users with at least one brand.
 * Sent Mondays (cron runs daily but cooldown_hours=168 enforces weekly cadence).
 */
async function runWeeklyDigestEmails(env) {
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT DISTINCT u.id as user_id, u.first_name, u.email,
                    b.id as brand_id, b.name as brand_name
    FROM users u
    JOIN brand_users bu ON bu.user_id = u.id
    JOIN brands b ON b.id = bu.brand_id
    WHERE u.verified_at IS NOT NULL
    LIMIT 500
  `).all();

  let sent = 0;
  for (const row of results || []) {
    try {
      // Get brand score and post count for digest data
      const stats = await db.prepare(`
        SELECT COUNT(*) as posts_this_week
        FROM content_vault
        WHERE brand_id = ? AND created_at >= datetime('now', '-7 days') AND lifecycle_status = 'published'
      `).bind(row.brand_id).first();

      const result = await triggerLifecycleEmail(env, {
        userId: row.user_id,
        brandId: row.brand_id,
        type: "weekly_digest",
        payload: {
          first_name: row.first_name,
          brand_name: row.brand_name,
          score: null,
          posts_this_week: stats?.posts_this_week || 0,
          top_insight: null,
        }
      });
      if (result) sent++;
    } catch (err) {
      console.error(`[LIFECYCLE-CRON] weekly_digest failed for ${row.user_id}:`, err.message);
    }
  }

  console.log(`[LIFECYCLE-CRON] weekly_digest: ${sent}/${(results || []).length} queued`);
}

/**
 * Onboarding reminder — users who registered but haven't completed onboarding
 * within 24 hours.
 */
async function runOnboardingReminderEmails(env) {
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT u.id as user_id, u.first_name, u.email, u.created_at
    FROM users u
    LEFT JOIN brand_users bu ON bu.user_id = u.id
    WHERE bu.user_id IS NULL
      AND u.created_at < datetime('now', '-1 day')
      AND u.created_at > datetime('now', '-7 days')
    LIMIT 100
  `).all();

  let sent = 0;
  for (const row of results || []) {
    try {
      const result = await triggerLifecycleEmail(env, {
        userId: row.user_id,
        brandId: null,
        type: "onboarding_reminder",
        payload: {
          first_name: row.first_name,
        }
      });
      if (result) sent++;
    } catch (err) {
      console.error(`[LIFECYCLE-CRON] onboarding_reminder failed for ${row.user_id}:`, err.message);
    }
  }

  console.log(`[LIFECYCLE-CRON] onboarding_reminder: ${sent}/${(results || []).length} queued`);
}
