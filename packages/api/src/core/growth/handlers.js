/**
 * myPilotPost — Growth API Handlers
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { handleGrowthEvent } from "./engine.js";

/**
 * GET /api/customer/growth/summary
 */
export async function getGrowthSummary(request, env, auth) {
  const { user_id, brand_id } = auth;
  const db = getDB(env);

  const profile = await db.prepare(`
    SELECT points, level, streak_days, referral_code 
    FROM growth_profiles 
    WHERE user_id = ? AND brand_id = ?
  `).bind(user_id, brand_id).first();

  if (!profile) {
    return json({
      points: 0,
      level: 'Starter',
      streak_days: 0,
      next_reward: { title: "Growth Level", points_required: 200 }
    });
  }

  // Find next reward threshold
  let nextReward = { title: "Pro Level", points_required: 600 };
  if (profile.level === 'Starter') {
    nextReward = { title: "Growth Level", points_required: 200 };
  } else if (profile.level === 'Pro') {
    nextReward = null;
  }

  // Calculate progress percentage to next level/reward
  let progress_percentage = 0;
  if (profile.level === 'Starter') {
    progress_percentage = Math.min(100, Math.round((profile.points / 200) * 100));
  } else if (profile.level === 'Growth') {
    progress_percentage = Math.min(100, Math.round(((profile.points - 200) / 400) * 100));
  } else {
    progress_percentage = 100;
  }

  // Fetch unlocked rewards
  const { results: unlocked } = await db.prepare(`
    SELECT r.* FROM growth_rewards r
    JOIN growth_activity a ON a.meta LIKE '%' || r.id || '%'
    WHERE a.user_id = ? AND a.brand_id = ? AND a.action_type = 'reward_redemption'
  `).bind(user_id, brand_id).all();

  // Fetch active nudges
  const { results: nudges } = await db.prepare(`
    SELECT message FROM growth_notifications 
    WHERE user_id = ? AND brand_id = ? AND type = 'nudge' AND is_read = 0
    ORDER BY created_at DESC LIMIT 3
  `).bind(user_id, brand_id).all();

  return json({
    ...profile,
    next_reward: nextReward,
    progress_percentage,
    unlocked_rewards: unlocked || [],
    active_nudges: (nudges || []).map(n => n.message)
  });
}

/**
 * GET /api/customer/growth/activity
 */
export async function getGrowthActivity(request, env, auth) {
  const { user_id, brand_id } = auth;
  const db = getDB(env);

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit")) || 20;

  // Identify the next reward
  const nextReward = await db.prepare(`
    SELECT * FROM growth_rewards 
    WHERE id NOT IN (
      SELECT json_extract(meta, '$.reward_id') 
      FROM growth_activity 
      WHERE user_id = ? AND brand_id = ? AND action_type = 'reward_redemption'
    )
    ORDER BY id ASC LIMIT 1
  `).bind(user_id, brand_id).first();

  const { results: activity } = await db.prepare(`
    SELECT action_type, points_awarded, created_at
    FROM growth_activity
    WHERE user_id = ? AND brand_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(user_id, brand_id, limit).all();

  return json({ activity: activity || [] });
}

/**
 * GET /api/customer/growth/rewards
 */
export async function getGrowthRewards(request, env, auth) {
  const db = getDB(env);
  
  const { results: rewards } = await db.prepare(`
    SELECT id, type, value, condition_json 
    FROM growth_rewards 
    WHERE is_active = 1
  `).all();

  return json({ rewards: rewards || [] });
}

/**
 * POST /api/customer/growth/action
 * Explicitly trigger a growth action (e.g. from frontend for sharing)
 */
export async function processGrowthAction(request, env, auth) {
  const { user_id, brand_id } = auth;
  
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return error("Invalid JSON", 400);
  }

  const { type, action_type, meta = {} } = body;
  const action = type || action_type;
  if (!action) return error("action type required", 400);

  // Validate action (only allow specific ones from frontend)
  const allowedActions = [
    'content_shared_whatsapp',
    'content_shared_social',
    'report_shared_client',
    'referral_shared'
  ];

  if (!allowedActions.includes(action)) {
    return error("Action type not allowed via this endpoint", 403);
  }

  await handleGrowthEvent({
    env,
    eventType: action,
    payload: { user_id, brand_id, meta }
  });

  return json({ success: true });
}

/**
 * POST /api/customer/growth/referral
 */
export async function registerReferral(request, env, auth) {
  const { user_id } = auth;
  
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return error("Invalid JSON", 400);
  }

  const { code } = body;
  if (!code) return error("Referral code required", 400);

  const db = getDB(env);

  // 1. Find referrer by code
  const referrer = await db.prepare(`
    SELECT user_id, brand_id FROM growth_profiles WHERE referral_code = ?
  `).bind(code.toUpperCase()).first();

  if (!referrer) return error("Invalid referral code", 404);
  if (referrer.user_id === user_id) return error("Cannot refer yourself", 400);

  // 2. Check if already referred
  const existing = await db.prepare(`
    SELECT id FROM referrals WHERE referred_user_id = ?
  `).bind(user_id).first();

  if (existing) return error("Referral already registered", 400);

  // 3. Create referral record
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO referrals (id, referrer_user_id, referred_user_id, status)
    VALUES (?, ?, ?, 'pending')
  `).bind(id, referrer.user_id, user_id).run();

  // 4. Reward Referrer for Signup
  await handleGrowthEvent({
    env,
    eventType: 'referral_signup',
    payload: { 
      user_id: referrer.user_id, 
      brand_id: referrer.brand_id,
      meta: { referred_user_id: user_id }
    }
  });

  return json({ success: true });
}
