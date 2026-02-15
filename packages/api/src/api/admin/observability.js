import { getDB } from "../../lib/db.js";

/**
 * Append-only admin observability event
 */
export async function writeSystemEvent(env, event) {
  const db = getDB(env);

  const {
    severity = "info",
    source = "unknown",
    message,
    metadata = null,
  } = event;

  if (!message) return;

  await db.prepare(`
    INSERT INTO admin_system_events (
      id,
      severity,
      source,
      message,
      metadata
    ) VALUES (?, ?, ?, ?, ?)
  `)
    .bind(
      crypto.randomUUID(),
      severity,
      source,
      message,
      metadata ? JSON.stringify(metadata) : null
    )
    .run();
}
