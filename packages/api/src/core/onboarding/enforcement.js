// packages/api/src/core/onboarding/enforcement.js
// myPilotPost — Readiness Enforcement v1 (AUTHORITATIVE)

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * Throws if user or brand is not ready for publish / schedule
 */
export async function enforceBrandReadiness(env, auth) {
  const db = getDB(env);

  /* Email verification */
  const user = await db
    .prepare(`SELECT email_verified FROM users WHERE id = ?`)
    .bind(auth.user_id)
    .first();

  if (!user || user.email_verified !== 1) {
    const err = new Error("Email verification required");
    err.status = 403;
    throw err;
  }

  /* Onboarding completion */
  const onboarding = await db
    .prepare(
      `SELECT completed
       FROM onboarding_progress
       WHERE brand_id = ?`
    )
    .bind(auth.brand_id)
    .first();

  if (!onboarding || onboarding.completed !== 1) {
    const err = new Error("Complete onboarding before publishing");
    err.status = 403;
    throw err;
  }
}
