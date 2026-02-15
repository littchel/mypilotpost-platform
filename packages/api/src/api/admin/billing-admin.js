import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * POST /api/admin/billing/assign-lifetime
 */
export async function assignLifetime(request, env) {
  const { customer_id } = await request.json();
  const db = getDB(env);

  await db.prepare(`
    INSERT INTO customer_plans (
      id,
      customer_id,
      plan_id,
      status,
      started_at,
      is_lifetime
    ) VALUES (?, ?, 'lifetime', 'active', CURRENT_TIMESTAMP, 1)
  `)
    .bind(crypto.randomUUID(), customer_id)
    .run();

  return json({ success: true });
}
