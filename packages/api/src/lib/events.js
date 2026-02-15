 import { getDB } from "./db.js";

export async function logEvent(env, {
  event_type,
  brand_id,
  user_id = null,
  content_id = null,
  metadata = {}
}) {
  const db = getDB(env);

  await db.prepare(`
    INSERT INTO usage_events (
      event_type,
      brand_id,
      user_id,
      content_id,
      metadata,
      created_at
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    event_type,
    brand_id,
    user_id,
    content_id,
    JSON.stringify(metadata)
  ).run();
}
