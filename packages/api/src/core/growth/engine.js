/**
 * myPilotPost — Growth Engine V2
 * Behavioral Psychology • Virality • Acquisition
 */

import { getDB } from "../../lib/db.js";
import { nanoid } from "nanoid";

const POINT_RULES = {
  content_published:        20,
  content_approved:         15,
  content_shared_whatsapp:  25,
  content_shared_social:    25,
  report_shared_client:     30,
  report_generated:         10,
  insight_resolved:         20,
  invite_accepted:          25,
  referral_signup:          40,
  referral_activation:      60,
  referral_conversion:      100,
  referral_shared:          10,
  daily_login:              5,
  audit_generated:          15,
  audit_unlocked:           25,
};

const STREAK_BONUS = {
  7:  20,
  30: 100,
};

/**
 * Handle system events for Growth
 */
export async function handleGrowthEvent({ env, eventType, payload }) {
  const { brand_id, user_id } = payload;
  if (!brand_id || !user_id) return;

  const db = getDB(env);
  const points = POINT_RULES[eventType] || 0;

  if (points === 0) return;

  // daily_login: award points at most once per calendar day per user (across all brands)
  if (eventType === 'daily_login') {
    const alreadyToday = await db.prepare(`
      SELECT id FROM growth_activity
      WHERE user_id = ? AND action_type = 'daily_login'
        AND date(created_at) = date('now')
      LIMIT 1
    `).bind(user_id).first();
    if (alreadyToday) return;
  }

  console.log(`[GROWTH] Processing ${eventType} for user ${user_id}. Points: ${points}`);

  // 1. Log Activity
  const activityId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO growth_activity (id, user_id, brand_id, action_type, points_awarded, meta)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    activityId,
    user_id,
    brand_id,
    eventType,
    points,
    JSON.stringify(payload.meta || {})
  ).run();

  // 2. Capture old profile BEFORE updating (streak needs the previous last_activity_at)
  const oldProfile = await db.prepare(`
    SELECT last_activity_at, streak_days FROM growth_profiles WHERE user_id = ? AND brand_id = ?
  `).bind(user_id, brand_id).first();

  // 3. Update Profile (Upsert)
  const profileId = crypto.randomUUID();
  const refCode = nanoid(8).toUpperCase();

  await db.prepare(`
    INSERT INTO growth_profiles (id, user_id, brand_id, points, level, streak_days, referral_code, last_activity_at)
    VALUES (?, ?, ?, ?, 'Starter', 0, ?, datetime('now'))
    ON CONFLICT(user_id, brand_id) DO UPDATE SET
      points = points + EXCLUDED.points,
      last_activity_at = datetime('now'),
      updated_at = datetime('now')
  `).bind(profileId, user_id, brand_id, points, refCode).run();

  // 4. Handle Referral Activation
  if (['content_published', 'content_approved', 'report_shared_client'].includes(eventType)) {
    await checkReferralActivation(db, user_id, env);
  }

  // 5. Handle Streak Logic — pass old last_activity_at captured before the upsert
  if (eventType === 'daily_login' || eventType === 'content_published') {
    await updateStreak(db, user_id, brand_id, oldProfile?.last_activity_at, oldProfile?.streak_days || 0);
  }

  // 6. Update Level
  await updateLevel(db, user_id, brand_id, env);

  // 7. Create Notification
  await db.prepare(`
    INSERT INTO growth_notifications (id, user_id, brand_id, message, type)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    user_id,
    brand_id,
    eventType === 'daily_login'
      ? `🔥 Daily Login! +${points} points`
      : `🔥 You earned +${points} points for ${eventType.replace(/_/g, ' ')}`,
    'reward'
  ).run();

  // Sync to main notification system
  const { handleNotificationEvent } = await import("../notifications/notifications.js");
  await handleNotificationEvent({
    env,
    eventType: eventType === 'daily_login' ? 'growth_streak' : 'growth_reward',
    payload: {
      brand_id,
      user_id,
      message: eventType === 'daily_login'
        ? `🔥 Daily Login! +${points} points`
        : `🔥 You earned +${points} points for ${eventType.replace(/_/g, ' ')}`,
      title: 'Growth Reward'
    }
  });

  // 8. Evaluate Nudges
  await evaluateNudges(db, user_id, brand_id, env);
}

/**
 * Streak Logic (24h Window)
 * Accepts the OLD last_activity_at captured before the profile upsert,
 * so diffHours reflects actual elapsed time, not "now vs now".
 */
async function updateStreak(db, user_id, brand_id, oldLastActivityAt, oldStreakDays) {
  const now = new Date();
  const lastActivity = oldLastActivityAt ? new Date(oldLastActivityAt) : null;

  if (!lastActivity) {
    // First ever event — initialise streak to 1
    await db.prepare(`
      UPDATE growth_profiles SET streak_days = 1, updated_at = datetime('now')
      WHERE user_id = ? AND brand_id = ?
    `).bind(user_id, brand_id).run();
    return;
  }

  const diffHours = (now - lastActivity) / (1000 * 60 * 60);

  let newStreak = oldStreakDays;
  let bonusPoints = 0;

  if (diffHours >= 24 && diffHours <= 48) {
    newStreak += 1;
    bonusPoints = STREAK_BONUS[newStreak] || 0;
  } else if (diffHours > 48) {
    newStreak = 1; // Reset — gap too long
  } else {
    return; // < 24h: already active today, no streak change
  }

  await db.prepare(`
    UPDATE growth_profiles
    SET streak_days = ?, points = points + ?, updated_at = datetime('now')
    WHERE user_id = ? AND brand_id = ?
  `).bind(newStreak, bonusPoints, user_id, brand_id).run();

  if (bonusPoints > 0) {
    await db.prepare(`
      INSERT INTO growth_notifications (id, user_id, brand_id, message, type)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      user_id,
      brand_id,
      `🎉 Streak Bonus! You earned +${bonusPoints} points for a ${newStreak} day streak!`,
      'milestone'
    ).run();
  }
}

/**
 * Leveling Logic
 */
async function updateLevel(db, user_id, brand_id, env) {
  const profile = await db.prepare(
    `SELECT points, level FROM growth_profiles WHERE user_id = ? AND brand_id = ?`
  ).bind(user_id, brand_id).first();
  if (!profile) return;

  let newLevel = 'Starter';
  const p = profile.points;

  if (p >= 600)      newLevel = 'Pro';
  else if (p >= 200) newLevel = 'Growth';

  if (newLevel !== profile.level) {
    await db.prepare(`
      UPDATE growth_profiles SET level = ?, updated_at = datetime('now')
      WHERE user_id = ? AND brand_id = ?
    `).bind(newLevel, user_id, brand_id).run();

    await db.prepare(`
      INSERT INTO growth_notifications (id, user_id, brand_id, message, type)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      user_id,
      brand_id,
      `🚀 You unlocked ${newLevel} Level!`,
      'milestone'
    ).run();

    await checkForRewards(db, user_id, brand_id, newLevel, env);
  }
}

/**
 * Nudge Engine (Behavioral Psychology)
 */
export async function evaluateNudges(db, user_id, brand_id, env) {
  const activity = await db.prepare(`
    SELECT DISTINCT action_type FROM growth_activity
    WHERE user_id = ? AND brand_id = ?
    LIMIT 100
  `).bind(user_id, brand_id).all();

  const types = new Set(activity.results?.map(a => a.action_type) || []);

  const nudges = [];

  if (!types.has('content_shared_whatsapp')) {
    nudges.push("Share your first post on WhatsApp to earn +25 points");
  }

  if (!types.has('report_shared_client')) {
    nudges.push("Invite a client and unlock advanced reports");
  }

  const profile = await db.prepare(
    `SELECT points FROM growth_profiles WHERE user_id = ? AND brand_id = ?`
  ).bind(user_id, brand_id).first();

  if (profile) {
    if (profile.points > 185 && profile.points < 200) {
      nudges.push(`You are ${200 - profile.points} points away from Growth Level`);
    }
  }

  if (nudges.length > 0) {
    const message = nudges[Math.floor(Math.random() * nudges.length)];

    const recentNudge = await db.prepare(`
      SELECT id FROM growth_notifications
      WHERE user_id = ? AND brand_id = ? AND type = 'nudge'
        AND created_at > datetime('now', '-1 day')
    `).bind(user_id, brand_id).first();

    if (!recentNudge) {
      await db.prepare(`
        INSERT INTO growth_notifications (id, user_id, brand_id, message, type)
        VALUES (?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), user_id, brand_id, message, 'nudge').run();

      const { handleNotificationEvent } = await import("../notifications/notifications.js");
      await handleNotificationEvent({
        env,
        eventType: 'growth_nudge',
        payload: { brand_id, user_id, message, title: 'Growth Tip' }
      });
    }
  }
}

async function checkReferralActivation(db, user_id, env) {
  const referral = await db.prepare(`
    SELECT * FROM referrals WHERE referred_user_id = ? AND status = 'pending'
  `).bind(user_id).first();

  if (referral) {
    await db.prepare(`
      UPDATE referrals SET status = 'activated' WHERE id = ?
    `).bind(referral.id).run();

    const referrerProfile = await db.prepare(`
      SELECT brand_id FROM growth_profiles WHERE user_id = ? LIMIT 1
    `).bind(referral.referrer_user_id).first();

    if (referrerProfile) {
      await handleGrowthEvent({
        env,
        eventType: 'referral_activation',
        payload: {
          user_id: referral.referrer_user_id,
          brand_id: referrerProfile.brand_id,
          meta: { activated_user_id: user_id }
        }
      });
    }
  }
}

async function checkForRewards(db, user_id, brand_id, level, env) {
  const { results: eligibleRewards } = await db.prepare(`
    SELECT id, type, value, condition_json FROM growth_rewards WHERE is_active = 1
  `).all();

  const profile = await db.prepare(
    `SELECT points FROM growth_profiles WHERE user_id = ? AND brand_id = ?`
  ).bind(user_id, brand_id).first();
  const currentPoints = profile?.points ?? 0;
  const levelOrder = { Starter: 0, Growth: 1, Pro: 2 };

  for (const reward of (eligibleRewards || [])) {
    let condition = {};
    try { condition = JSON.parse(reward.condition_json || '{}'); } catch (_) {}

    const requiredLevel = condition.level;
    if (requiredLevel && levelOrder[level] < levelOrder[requiredLevel]) continue;
    if (condition.points_required && currentPoints < condition.points_required) continue;

    const alreadyRedeemed = await db.prepare(`
      SELECT id FROM growth_activity
      WHERE user_id = ? AND brand_id = ? AND action_type = 'reward_level_unlocked'
        AND meta LIKE ?
    `).bind(user_id, brand_id, `%${reward.id}%`).first();
    if (alreadyRedeemed) continue;

    await db.prepare(`
      INSERT INTO growth_activity (id, user_id, brand_id, action_type, points_awarded, meta)
      VALUES (?, ?, ?, 'reward_level_unlocked', 0, ?)
    `).bind(
      crypto.randomUUID(), user_id, brand_id,
      JSON.stringify({ reward_id: reward.id, type: reward.type, value: reward.value, level })
    ).run();

    await db.prepare(`
      INSERT INTO growth_notifications (id, user_id, brand_id, message, type)
      VALUES (?, ?, ?, ?, 'reward')
    `).bind(
      crypto.randomUUID(), user_id, brand_id,
      `🎁 You unlocked a reward: ${reward.type === 'bonus_days' ? `${reward.value} bonus days` : reward.value.replace(/_/g, ' ')}`
    ).run();

    const { handleNotificationEvent } = await import("../notifications/notifications.js");
    await handleNotificationEvent({
      env,
      eventType: 'growth_reward',
      payload: {
        brand_id,
        user_id,
        title: 'Reward Unlocked',
        message: `You reached ${level} level and unlocked a new reward.`,
      }
    });
  }
}

/**
 * Apply Reward Logic
 */
export async function applyReward(env, user_id, brand_id, reward_id) {
  const db = getDB(env);
  const reward = await db.prepare(`SELECT * FROM growth_rewards WHERE id = ?`).bind(reward_id).first();
  if (!reward) throw new Error("Reward not found");

  // Idempotency: block double-redemption
  const alreadyRedeemed = await db.prepare(`
    SELECT id FROM growth_activity
    WHERE user_id = ? AND brand_id = ? AND action_type = 'reward_redemption'
      AND meta LIKE ?
  `).bind(user_id, brand_id, `%${reward_id}%`).first();
  if (alreadyRedeemed) return { already_redeemed: true };

  if (reward.type === 'bonus_days' || reward.type === 'trial_extension') {
    const days = parseInt(reward.value);
    await db.prepare(`
      UPDATE subscriptions
      SET current_period_end = datetime(COALESCE(current_period_end, datetime('now')), '+' || ? || ' days'),
          updated_at = datetime('now')
      WHERE brand_id = ?
    `).bind(days, brand_id).run();
  }

  if (reward.type === 'feature_unlock' || reward.type === 'report_unlock') {
    await db.prepare(`
      UPDATE brands
      SET metadata = json_set(COALESCE(metadata, '{}'), '$.unlocked_' || ?, 1)
      WHERE id = ?
    `).bind(reward.value, brand_id).run();
  }

  await db.prepare(`
    INSERT INTO growth_activity (id, user_id, brand_id, action_type, points_awarded, meta)
    VALUES (?, ?, ?, ?, 0, ?)
  `).bind(
    crypto.randomUUID(),
    user_id,
    brand_id,
    'reward_redemption',
    JSON.stringify({ reward_id, type: reward.type, value: reward.value })
  ).run();

  return { already_redeemed: false };
}
