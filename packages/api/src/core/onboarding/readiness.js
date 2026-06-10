// packages/api/src/core/onboarding/readiness.js

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

export async function getReadiness(request, env, auth) {
  const db = getDB(env);

  const user = await db
    .prepare(`SELECT email_verified FROM users WHERE id = ?`)
    .bind(auth.user_id)
    .first();

  // onboarding_progress uses user_id PK with current_step + completed_at
  const onboarding = await db
    .prepare(
      `SELECT current_step, completed_at, data
       FROM onboarding_progress
       WHERE user_id = ?`
    )
    .bind(auth.user_id)
    .first();

  // Count connected platforms for this brand
  const platformRow = await db
    .prepare(
      `SELECT COUNT(*) as count FROM brand_platforms
       WHERE brand_id = ? AND status = 'connected'`
    )
    .bind(auth.brand_id)
    .first();

  const completed = !!onboarding?.completed_at;

  return json({
    email_verified: user?.email_verified === 1,
    onboarding: {
      exists: !!onboarding,
      completed,
      current_step: onboarding?.current_step || 0,
      platforms_connected: platformRow?.count || 0
    },
    can_schedule: user?.email_verified === 1 && completed
  });
}
