import { getDB } from "../../lib/db.js";

export async function emitLifecycleEvent(env, {
  customerId = null,
  brandId = null,
  type,
  payload = {}
}) {
  const db = getDB(env);

  await db.prepare(`
    INSERT INTO lifecycle_events (
      id,
      customer_id,
      brand_id,
      type,
      payload
    ) VALUES (?, ?, ?, ?, ?)
  `)
    .bind(
      crypto.randomUUID(),
      customerId,
      brandId,
      type,
      JSON.stringify(payload)
    )
    .run();
}
