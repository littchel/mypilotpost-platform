// packages/api/src/core/onboarding/readiness.js
// myPilotPost — Readiness Status v1 (READ-ONLY)

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

export async function getReadiness(request, env, auth) {
  const db = getDB(env);

  const user = await db
    .prepare(
      `SELECT email_verified
       FROM users
       WHERE id = ?`
    )
    .bind(auth.user_id)
    .first();

  const onboarding = await db
    .prepare(
      `SELECT
         completed,
         step,
         industry,
         website,
         platforms_connected
       FROM onboarding_progress
       WHERE brand_id = ?`
    )
    .bind(auth.brand_id)
    .first();

  return json({
    email_verified: user?.email_verified === 1,

    onboarding: {
      exists: !!onboarding,
      completed: onboarding?.completed === 1,
      current_step: onboarding?.step || null,
      industry: onboarding?.industry || null,
      website: onboarding?.website || null,
      platforms_connected: onboarding?.platforms_connected || 0
    },

    can_schedule:
      user?.email_verified === 1 &&
      onboarding?.completed === 1
  });
}
