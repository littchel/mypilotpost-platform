// packages/api/src/core/support/threads.js
// Shared support-thread helpers. Canonical tables: support_threads, support_messages.
// Used by both the customer real-time chat (routes/support.js) and admin support (core/support/admin.js).

/**
 * Deterministic ChatRoom Durable Object for a user pair (reused real-time infra).
 */
export function getChatRoom(env, u1, u2) {
  const roomName = [u1, u2].sort().join("--");
  const roomId = env.CHAT_ROOM.idFromName(roomName);
  return env.CHAT_ROOM.get(roomId);
}

/**
 * Find an open support thread for a customer, or create one.
 * A thread requires brand_id + customer_id (both NOT NULL).
 * brandHint lets the caller pass a known brand; otherwise we resolve the
 * customer's first owned brand.
 *
 * @returns {Promise<{id, brand_id, customer_id, status, priority}>}
 */
export async function findOrCreateThread(db, customerId, brandHint = null) {
  // 1. Existing non-closed thread?
  const existing = await db.prepare(`
    SELECT id, brand_id, customer_id, status, priority
    FROM support_threads
    WHERE customer_id = ? AND status != 'closed'
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(customerId).first().catch(() => null);
  if (existing) return existing;

  // 2. Resolve a brand for the thread (NOT NULL constraint)
  let brandId = brandHint;
  if (!brandId) {
    const brandRow = await db.prepare(`
      SELECT brand_id FROM brand_users
      WHERE user_id = ?
      ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END, created_at ASC
      LIMIT 1
    `).bind(customerId).first().catch(() => null);
    brandId = brandRow?.brand_id || null;
  }
  if (!brandId) {
    // Last resort: any brand owned directly
    const ownRow = await db.prepare(
      "SELECT id AS brand_id FROM brands WHERE owner_user_id = ? LIMIT 1"
    ).bind(customerId).first().catch(() => null);
    brandId = ownRow?.brand_id || null;
  }
  if (!brandId) {
    throw new Error("Cannot create support thread: customer has no associated brand");
  }

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO support_threads (id, brand_id, customer_id, status, priority, created_at)
    VALUES (?, ?, ?, 'open', 'normal', datetime('now'))
  `).bind(id, brandId, customerId).run();

  return { id, brand_id: brandId, customer_id: customerId, status: "open", priority: "normal" };
}

/**
 * Persist a support message with ALL required NOT NULL columns populated
 * (thread_id, sender_type, sender_id, message), then broadcast over the
 * ChatRoom DO so any open SSE stream for the pair receives it live.
 *
 * @param {object} opts
 * @param {string} opts.threadId
 * @param {string} opts.senderId
 * @param {string} opts.receiverId
 * @param {string} opts.message
 * @param {boolean} opts.isAdmin
 * @param {string} [opts.origin]   — request origin for the DO fetch
 * @returns {Promise<object>} the broadcast payload
 */
export async function persistAndBroadcast(db, env, { threadId, senderId, receiverId, message, isAdmin, origin }) {
  const msgId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const senderType = isAdmin ? "admin" : "customer";

  await db.prepare(`
    INSERT INTO support_messages
      (id, thread_id, sender_type, sender_id, receiver_id, message, is_admin_msg, read_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
  `).bind(msgId, threadId, senderType, senderId, receiverId, message, isAdmin ? 1 : 0, timestamp).run();

  // Bump thread activity
  await db.prepare(
    "UPDATE support_threads SET status = CASE WHEN status = 'closed' THEN 'open' ELSE status END WHERE id = ?"
  ).bind(threadId).run().catch(() => {});

  const payload = {
    type: "message",
    id: msgId,
    thread_id: threadId,
    sender_id: senderId,
    sender_type: senderType,
    receiver_id: receiverId,
    message,
    timestamp,
  };

  // Live broadcast via ChatRoom DO (room keyed by user pair)
  try {
    const room = getChatRoom(env, senderId, receiverId);
    await room.fetch(new Request(`${origin || "https://api.mypilotpost.com"}/message`, {
      method: "POST",
      body: JSON.stringify(payload),
    }));
  } catch (err) {
    console.error("[SUPPORT] ChatRoom broadcast failed", err);
  }

  return payload;
}
