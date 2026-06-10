/**
 * Admin — Rewards Read-Only Visibility
 * Read-only. No mutations.
 */

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/v1/admin/rewards
 * Returns reward profiles, history, referrals, and unlock events.
 */
export async function getAdminRewardsOverview(request, env) {
  const db = getDB(env);

  const [profilesRes, historyRes, referralsRes, eventsRes] = await Promise.all([
    db.prepare(`
      SELECT gp.user_id, u.email, gp.brand_id, gp.points, gp.level,
             gp.streak_days, gp.referral_code, gp.last_activity_at
      FROM growth_profiles gp
      LEFT JOIN users u ON u.id = gp.user_id
      ORDER BY gp.points DESC
      LIMIT 100
    `).all(),

    db.prepare(`
      SELECT ga.user_id, u.email, ga.brand_id, ga.action_type,
             ga.points_awarded, ga.meta, ga.created_at
      FROM growth_activity ga
      LEFT JOIN users u ON u.id = ga.user_id
      ORDER BY ga.created_at DESC
      LIMIT 200
    `).all(),

    db.prepare(`
      SELECT r.id, r.referrer_user_id, ru.email AS referrer_email,
             r.referred_user_id, uu.email AS referred_email,
             r.status, r.created_at
      FROM referrals r
      LEFT JOIN users ru ON ru.id = r.referrer_user_id
      LEFT JOIN users uu ON uu.id = r.referred_user_id
      ORDER BY r.created_at DESC
      LIMIT 100
    `).all(),

    db.prepare(`
      SELECT gn.user_id, u.email, gn.brand_id, gn.message,
             gn.type, gn.is_read, gn.created_at
      FROM growth_notifications gn
      LEFT JOIN users u ON u.id = gn.user_id
      WHERE gn.type IN ('reward', 'milestone')
      ORDER BY gn.created_at DESC
      LIMIT 100
    `).all(),
  ]);

  return json({
    profiles:  profilesRes.results  || [],
    history:   historyRes.results   || [],
    referrals: referralsRes.results || [],
    events:    eventsRes.results    || [],
  });
}
