// packages/api/src/core/messages/messages.js
import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";

/**
 * UNIFIED MESSAGING SYSTEM — BRAND ISOLATION REINFORCED
 */

export async function sendMessage(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const body = await request.json();

  const { thread_id, content, type = 'team' } = body;

  if (!content) return error("Message content is required", "BAD_REQUEST", null, 400);

  const messageId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO messages (id, thread_id, brand_id, sender_id, type, content)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(messageId, thread_id, brand_id, user_id, type, content).run();

  // Broadcast logic (optional integration with ChatRoom DO)
  
  return json({ success: true, message_id: messageId });
}

export async function listMessages(request, env, auth) {
  const db = getDB(env);
  const { brand_id } = auth;
  const url = new URL(request.url);
  const thread_id = url.searchParams.get("thread_id");

  if (!thread_id) return error("Thread ID required", "BAD_REQUEST", null, 400);

  const { results } = await db.prepare(`
    SELECT * FROM messages 
    WHERE brand_id = ? AND thread_id = ? 
    ORDER BY created_at ASC
  `).bind(brand_id, thread_id).all();

  return json({ success: true, data: results || [] });
}
