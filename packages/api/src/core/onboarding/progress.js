import { getDB } from "../../lib/db.js";

/**
 * Marks a single onboarding step as complete for a brand
 */
export async function markOnboardingStep(env, brandId, step) {
  const db = getDB(env);

  await db
    .prepare(
      `INSERT INTO onboarding_progress (brand_id, ${step})
       VALUES (?, 1)
       ON CONFLICT(brand_id)
       DO UPDATE SET
         ${step} = 1,
         updated_at = datetime('now')`
    )
    .bind(brandId)
    .run();

  // Recalculate completion
  await db
    .prepare(
      `UPDATE onboarding_progress
       SET completed = CASE
         WHEN brand_identity = 1
          AND business_type = 1
          AND audience = 1
          AND goals = 1
          AND platforms = 1
         THEN 1 ELSE 0 END
       WHERE brand_id = ?`
    )
    .bind(brandId)
    .run();
}
