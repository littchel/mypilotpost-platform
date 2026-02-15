import { getDB } from "../../lib/db.js";

export async function createNotification(env, payload) {
  const db = getDB(env);

  const {
    recipientType,
    recipientId,
    brandId = null,
    type,
    title,
    message,
    data = null,
  } = payload;

  await db.prepare(`
    INSERT INTO notifications (
      id,
      recipient_type,
      recipient_id,
      brand_id,
      type,
      title,
      message,
      data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    crypto.randomUUID(),
    recipientType,
    recipientId,
    brandId,
    type,
    title,
    message,
    data ? JSON.stringify(data) : null
  )
  .run();
}
