import { getDB } from "../../lib/db.js";

export async function listCustomerNotifications(request, env, session) {
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT *
    FROM notifications
    WHERE recipient_type = 'customer'
      AND recipient_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `)
  .bind(session.user_id)
  .all();

  return new Response(JSON.stringify({ notifications: results }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function markNotificationRead(request, env, id, session) {
  const db = getDB(env);

  await db.prepare(`
    UPDATE notifications
    SET read = 1
    WHERE id = ?
      AND recipient_type = 'customer'
      AND recipient_id = ?
  `)
  .bind(id, session.user_id)
  .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
