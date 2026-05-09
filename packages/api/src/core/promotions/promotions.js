/**
 * myPilotPost — PROMOTION & REFERRAL ENGINE
 * AUTHORITATIVE • SaaS GROWTH LOOP
 */

import { json, error } from "../../lib/json.js";

/* ======================================================
   HELPERS
   ====================================================== */

/**
 * generateReferralCode(db, email)
 * Creates MP-USER-XXXX unique code with collision retry.
 */
export async function generateReferralCode(db, userId, email) {
  const prefix = email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1
  
  let code;
  let attempts = 0;
  
  while (attempts < 5) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    code = `MP-${prefix}-${suffix}`;

    // Check collision
    const existing = await db.prepare("SELECT 1 FROM referral_codes WHERE code = ?").bind(code).first();
    if (!existing) {
      await db.prepare("INSERT INTO referral_codes (user_id, code) VALUES (?, ?)").bind(userId, code).run();
      return code;
    }
    attempts++;
  }
  
  // Fallback to UUID-based string if high collision (unlikely)
  code = `MP-${prefix}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  await db.prepare("INSERT INTO referral_codes (user_id, code) VALUES (?, ?)").bind(userId, code).run();
  return code;
}

/* ======================================================
   REGISTRATION & RISK
   ====================================================== */

/**
 * registerReferral(db, code, referredUserId, metadata)
 * Links new user and assesses fraud risk.
 */
export async function registerReferral(db, code, referredUserId, metadata = {}) {
  // 1. Validate code exists
  const referrer = await db.prepare("SELECT user_id FROM referral_codes WHERE code = ?").bind(code).first();
  if (!referrer) return null; // Silent ignore per requirements

  // 2. Prevent self-referral
  if (referrer.user_id === referredUserId) return null;

  // 3. Assess Risk
  let riskScore = 0;
  let riskLevel = 'low';

  // Check same IP
  if (metadata.ip) {
    const ipMatch = await db.prepare(`
        SELECT COUNT(*) as count FROM referrals 
        WHERE (referrer_user_id = ? OR json_extract(metadata_json, '$.ip') = ?)
        AND created_at > datetime('now', '-24 hours')
    `).bind(referrer.user_id, metadata.ip).first();

    if (ipMatch.count > 0) riskScore += 40;
  }

  // Check rapid referrals (burst protection)
  const burstMatch = await db.prepare(`
    SELECT COUNT(*) as count FROM referrals 
    WHERE referrer_user_id = ? AND created_at > datetime('now', '-5 minutes')
  `).bind(referrer.user_id).first();
  if (burstMatch.count > 0) riskScore += 30;

  if (riskScore >= 70) riskLevel = 'high';
  else if (riskScore >= 30) riskLevel = 'medium';

  // 4. Create Referral
  const referralId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO referrals (id, referrer_user_id, referred_user_id, referral_code, status, risk_level, risk_score, metadata_json)
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
  `).bind(
    referralId, 
    referrer.user_id, 
    referredUserId, 
    code, 
    riskLevel, 
    riskScore, 
    JSON.stringify(metadata)
  ).run();

  return referralId;
}

/* ======================================================
   LIFECYCLE & REWARDS
   ====================================================== */

/**
 * completeReferral(db, userId, env)
 * Triggered when user enters delivery_jobs.
 */
export async function completeReferral(db, userId, env = {}) {
  const referral = await db.prepare("SELECT id, status FROM referrals WHERE referred_user_id = ? AND status = 'pending'").bind(userId).first();
  if (!referral) return;

  await db.prepare("UPDATE referrals SET status = 'completed', completed_at = datetime('now') WHERE id = ?").bind(referral.id).run();
  
  // Attempt to grant reward immediately
  return grantReferralReward(db, referral.id, env);
}

/**
 * grantReferralReward(db, referralId, env)
 * Atomically grants rewards to both inviter and invitee.
 */
export async function grantReferralReward(db, referralId, env = {}) {
  const multiplier = env.REWARD_MULTIPLIER ? parseInt(env.REWARD_MULTIPLIER) : 1;
  const baseReward = 7;
  const totalReward = baseReward * multiplier;

  // 1. Hydrate and check status (Atomic transition completed -> rewarded)
  const ref = await db.prepare("SELECT * FROM referrals WHERE id = ?").bind(referralId).first();
  if (!ref || ref.status !== 'completed') return false;

  // 2. Anti-abuse: check risk
  if (ref.risk_level === 'high') return false;

  // 3. Monthly Cap Enforcement (Max 10 per calendar month)
  const monthlyCount = await db.prepare(`
    SELECT COUNT(*) as count FROM referrals 
    WHERE referrer_user_id = ? 
    AND status = 'rewarded' 
    AND rewarded_at >= datetime('now', 'start of month')
  `).bind(ref.referrer_user_id).first();

  if (monthlyCount.count >= 10) return { error: 'LIMIT_REACHED' };

  // 4. Atomic Reward Block
  try {
    await db.batch([
        // Transitions
        db.prepare("UPDATE referrals SET status = 'rewarded', rewarded_at = datetime('now') WHERE id = ?").bind(referralId),
        
        // Audit Logs (Inviter)
        db.prepare(`
            INSERT INTO promotion_rewards (id, user_id, referral_id, type, value, source)
            VALUES (?, ?, ?, 'trial_extension', ?, 'referral')
        `).bind(crypto.randomUUID(), ref.referrer_user_id, referralId, totalReward),
        
        // Audit Logs (Invitee)
        db.prepare(`
            INSERT INTO promotion_rewards (id, user_id, referral_id, type, value, source)
            VALUES (?, ?, ?, 'trial_extension', ?, 'referral')
        `).bind(crypto.randomUUID(), ref.referred_user_id, referralId, totalReward),
        
        // Subscription Update (Inviter)
        db.prepare(`
            UPDATE subscriptions SET 
            trial_extended_until = datetime(MAX(COALESCE(trial_extended_until, trial_ends_at, datetime('now')), datetime('now')), '+${totalReward} days')
            WHERE user_id = ?
        `).bind(ref.referrer_user_id),

        // Subscription Update (Invitee)
        db.prepare(`
            UPDATE subscriptions SET 
            trial_extended_until = datetime(MAX(COALESCE(trial_extended_until, trial_ends_at, datetime('now')), datetime('now')), '+${totalReward} days')
            WHERE user_id = ?
        `).bind(ref.referred_user_id)
    ]);
    return { success: true, reward: totalReward };
  } catch (err) {
    console.error("Failed to grant referral reward", err);
    return false;
  }
}

/**
 * getPromotionStatus(db, userId)
 */
export async function getPromotionStatus(db, userId) {
  const codeRow = await db.prepare("SELECT code FROM referral_codes WHERE user_id = ?").bind(userId).first();
  
  // Funnel Metrics
  const sent = await db.prepare("SELECT COUNT(*) as count FROM referrals WHERE referrer_user_id = ?").bind(userId).first();
  const signed_up = await db.prepare("SELECT COUNT(*) as count FROM referrals WHERE referrer_user_id = ? AND status IN ('pending', 'completed', 'rewarded')").bind(userId).first();
  const completed = await db.prepare("SELECT COUNT(*) as count FROM referrals WHERE referrer_user_id = ? AND status IN ('completed', 'rewarded')").bind(userId).first();
  
  const successfulRefs = await db.prepare("SELECT COUNT(*) as count FROM referrals WHERE referrer_user_id = ? AND status = 'rewarded'").bind(userId).first();
  const rewards = await db.prepare("SELECT SUM(value) as total FROM promotion_rewards WHERE user_id = ? AND type = 'trial_extension'").bind(userId).first();

  // Monthly Progress (Current Calendar Month)
  const monthlyCount = await db.prepare(`
    SELECT COUNT(*) as count FROM referrals 
    WHERE referrer_user_id = ? 
    AND status = 'rewarded' 
    AND rewarded_at >= datetime('now', 'start of month')
  `).bind(userId).first();

  const referralList = await db.prepare(`
    SELECT email, status, referrals.created_at as joined
    FROM referrals
    JOIN users ON referrals.referred_user_id = users.id
    WHERE referrer_user_id = ?
    ORDER BY referrals.created_at DESC
    LIMIT 10
  `).bind(userId).all();

  return {
    referral_code: codeRow?.code || null,
    total_referrals: successfulRefs?.count || 0,
    rewards_earned: rewards?.total || 0,
    funnel: {
      sent: sent?.count || 0,
      signed_up: signed_up?.count || 0,
      completed: completed?.count || 0
    },
    monthly: {
      count: monthlyCount?.count || 0,
      limit: 10
    },
    list: referralList?.results || []
  };
}
