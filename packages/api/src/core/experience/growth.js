// packages/api/src/core/experience/growth.js
import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";

/**
 * GET GROWTH SCORE — reads from canonical growth_profiles
 */
export async function getGrowthScore(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;

  const profile = await db.prepare(`
    SELECT points, level, streak_days FROM growth_profiles WHERE user_id = ? AND brand_id = ?
  `).bind(user_id, brand_id).first();

  return json({
    success: true,
    score:   profile?.points      || 0,
    level:   profile?.level       || 'Starter',
    streak:  profile?.streak_days || 0,
    tier:    profile?.level       || 'Starter',
  });
}
