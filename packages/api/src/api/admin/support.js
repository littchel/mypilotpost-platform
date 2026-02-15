import { getDB } from "../../lib/db.js";

export async function listSupportThreads(env) {
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT *
    FROM support_threads
    ORDER BY created_at DESC
  `).all();

  return new Response(JSON.stringify({ threads: results }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function postAdminMessage(request, env, threadId) {
  const db = getDB(env);
  const { message, admin_id } = await request.json();

  await db.prepare(`
    INSERT INTO support_messages (
      id, thread_id, sender_type, sender_id, message
    ) VALUES (?, ?, 'admin', ?, ?)
  `)
  .bind(
    crypto.randomUUID(),
    threadId,
    admin_id,
    message
  )
  .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
