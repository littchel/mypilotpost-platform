// packages/api/src/core/dashboard/activity.js

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * DASHBOARD ACTIVITY — PHASE 2B
 * - Read-only
 * - Brand-scoped
 * - Schema-aligned
 */
export async function getActivity(env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Brand context missing" }, 400);
  }

  const db = getDB(env);

  const { results } = await db
    .prepare(`
      SELECT
        id,
        type,
        entity_type,
        entity_id,
        created_at
      FROM missions
      WHERE brand_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `)
    .bind(auth.brand_id)
    .all();

  return json({
    brand_id: auth.brand_id,
    activity: results || []
  });
}
