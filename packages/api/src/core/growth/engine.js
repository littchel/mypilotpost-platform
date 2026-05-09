/**
 * myPilotPost — Growth Engine V2
 * Behavioral Psychology • Virality • Acquisition
 */

import { getDB } from "../../lib/db.js";
import { nanoid } from "nanoid";

const POINT_RULES = {
  content_published: 20,
  content_approved: 15,
  content_shared_whatsapp: 25,
  content_shared_social: 25,
  report_shared_client: 30,
  referral_signup: 40,
  referral_activation: 60,
  referral_conversion: 100,
  referral_shared: 10,
  daily_login: 5,
  audit_generated: 15,
  audit_unlocked: 25,
};

const STREAK_BONUS = {
  7: 20,
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

  // 2. Update Profile (Upsert)
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

  // 3. Handle Referral Activation
  if (['content_published', 'content_approved', 'report_shared_client'].includes(eventType)) {
    await checkReferralActivation(db, user_id, env);
  }

  // 4. Handle Streak Logic
  if (eventType === 'daily_login' || eventType === 'content_published') {
    await updateStreak(db, user_id, brand_id);
  }

  // 5. Update Level
  await updateLevel(db, user_id, brand_id);

  // 6. Create Notification
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

  // 7. Evaluate Nudges
  await evaluateNudges(db, user_id, brand_id);
}

/**
 * Streak Logic (24h Window)
 */
async function updateStreak(db, user_id, brand_id) {
  const profile = await db.prepare(`
    SELECT streak_days, last_activity_at FROM growth_profiles 
    WHERE user_id = ? AND brand_id = ?
  `).bind(user_id, brand_id).first();

  if (!profile) return;

  const now = new Date();
  const lastActivity = profile.last_activity_at ? new Date(profile.last_activity_at) : null;
  
  if (!lastActivity) return;

  const diffHours = (now - lastActivity) / (1000 * 60 * 60);

  // If activity is within 24-48h window, increment streak
  // If > 48h, reset streak
  // If < 24h, do nothing (already active today)
  
  let newStreak = profile.streak_days || 0;
  let bonusPoints = 0;

  if (diffHours >= 24 && diffHours <= 48) {
    newStreak += 1;
    bonusPoints = STREAK_BONUS[newStreak] || 0;
  } else if (diffHours > 48) {
    newStreak = 1; // Reset to 1 since they are active now
  }

  if (newStreak !== profile.streak_days || bonusPoints > 0) {
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
}

/**
 * Leveling Logic
 */
async function updateLevel(db, user_id, brand_id) {
  const profile = await db.prepare(`SELECT points, level FROM growth_profiles WHERE user_id = ? AND brand_id = ?`).bind(user_id, brand_id).first();
  if (!profile) return;

  let newLevel = 'Starter';
  const p = profile.points;

  if (p >= 600) newLevel = 'Pro';
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

    // Potential Reward Unlock trigger
    await checkForRewards(db, user_id, brand_id, newLevel);
  }
}

/**
 * Nudge Engine (Behavioral Psychology)
 */
export async function evaluateNudges(db, user_id, brand_id) {
  // Check for common missing actions
  const activity = await db.prepare(`
    SELECT action_type FROM growth_activity 
    WHERE user_id = ? AND brand_id = ?
  `).bind(user_id, brand_id).all();
  
  const types = new Set(activity.results?.map(a => a.action_type) || []);

  const nudges = [];

  if (!types.has('content_shared_whatsapp')) {
    nudges.push("Share your first post on WhatsApp to earn +25 points");
  }

  if (!types.has('report_shared_client')) {
    nudges.push("Invite a client and unlock advanced reports");
  }

  const profile = await db.prepare(`SELECT points FROM growth_profiles WHERE user_id = ? AND brand_id = ?`).bind(user_id, brand_id).first();
  if (profile) {
    if (profile.points > 185 && profile.points < 200) {
      nudges.push(`You are ${200 - profile.points} points away from Growth Level`);
    }
  }

  if (nudges.length > 0) {
    const message = nudges[Math.floor(Math.random() * nudges.length)];
    
    // Check if we sent a nudge recently to avoid spam
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

      // Sync to main notification system
      const { handleNotificationEvent } = await import("../notifications/notifications.js");
      await handleNotificationEvent({
        env: { mypilotpost: db }, // Mock env for the helper if it only needs db
        eventType: 'growth_nudge',
        payload: {
          brand_id,
          user_id,
          message,
          title: 'Growth Tip'
        }
      });
    }
  }
}

async function checkReferralActivation(db, user_id, env) {
  const referral = await db.prepare(`
    SELECT * FROM referrals WHERE referred_user_id = ? AND status = 'pending'
  `).bind(user_id).first();

  if (referral) {
    // Update status to activated
    await db.prepare(`
      UPDATE referrals SET status = 'activated' WHERE id = ?
    `).bind(referral.id).run();

    // Find referrer's brand to award points
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

async function checkForRewards(db, user_id, brand_id, level) {
  // Logic to auto-apply rewards based on level or conditions
  // For now, placeholders
  console.log(`[GROWTH] Checking rewards for ${user_id} at level ${level}`);
}

/**
 * Apply Reward Logic
 */
export async function applyReward(env, user_id, brand_id, reward_id) {
  const db = getDB(env);
  const reward = await db.prepare(`SELECT * FROM growth_rewards WHERE id = ?`).bind(reward_id).first();
  if (!reward) throw new Error("Reward not found");

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
    // We can store unlocked features in brand_settings or a dedicated table
    // For now, we'll log it and the UI will check growth_activity or rewards
    console.log(`[GROWTH] Feature unlocked: ${reward.value} for brand ${brand_id}`);
    
    // Potential implementation: Add to a JSON field in brands table
    await db.prepare(`
      UPDATE brands 
      SET metadata = json_set(COALESCE(metadata, '{}'), '$.unlocked_' || ?, 1)
      WHERE id = ?
    `).bind(reward.value, brand_id).run();
  }

  // Record redemption
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
  // Mark as redeemed or similar in a separate table if needed
}
