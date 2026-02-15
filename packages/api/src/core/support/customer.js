import { getDB } from "../../lib/db.js";

export async function openSupportThread(request, env, session) {
  const db = getDB(env);
  const { brand_id, message } = await request.json();

  const threadId = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO support_threads (id, brand_id, customer_id)
    VALUES (?, ?, ?)
  `)
  .bind(threadId, brand_id, session.user_id)
  .run();

  await db.prepare(`
    INSERT INTO support_messages (
      id, thread_id, sender_type, sender_id, message
    ) VALUES (?, ?, 'customer', ?, ?)
  `)
  .bind(
    crypto.randomUUID(),
    threadId,
    session.user_id,
    message
  )
  .run();

  return new Response(JSON.stringify({ thread_id: threadId }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function postSupportMessage(request, env, threadId, session) {
  const db = getDB(env);
  const { message } = await request.json();

  await db.prepare(`
    INSERT INTO support_messages (
      id, thread_id, sender_type, sender_id, message
    ) VALUES (?, ?, 'customer', ?, ?)
  `)
  .bind(
    crypto.randomUUID(),
    threadId,
    session.user_id,
    message
  )
  .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function listCustomerThreads(env, session) {
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT *
    FROM support_threads
    WHERE customer_id = ?
    ORDER BY created_at DESC
  `)
  .bind(session.user_id)
  .all();

  return new Response(JSON.stringify({ threads: results }), {
    headers: { "Content-Type": "application/json" }
  });
}
