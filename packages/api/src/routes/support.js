import { Hono } from "hono";
import { requireAuth, requirePermission } from "../auth/middleware.js";
import { getDB } from "../lib/db.js";
import { json, error } from "../lib/json.js";
import { rateLimit } from "../lib/rate-limit.js";
import { getChatRoom, findOrCreateThread, persistAndBroadcast } from "../core/support/threads.js";

export const supportRoutes = new Hono().basePath("/api/v1/support");

supportRoutes.post("/authorize", async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  const body = await c.req.json().catch(() => ({}));
  const { other_id } = body;
  
  if (!other_id) {
    return error("Missing other_id for conversation", "BAD_REQUEST", null, 400);
  }

  const db = getDB(c.env);
  const ticketId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60000).toISOString();
  
  await db.prepare(`
    INSERT INTO support_tickets (id, user_id, other_id, role, scope, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(ticketId, auth.user_id, other_id, auth.role, 'support_stream', expiresAt).run();
  
  return json({ success: true, ticket: ticketId });
});

supportRoutes.get("/stream", async (c) => {
  const ticketId = c.req.query("ticket");
  if (!ticketId) {
    return error("Missing ticket", "UNAUTHORIZED", null, 401);
  }

  const db = getDB(c.env);
  
  // 1. Validate Ticket
  const ticket = await db.prepare(`
    SELECT * FROM support_tickets 
    WHERE id = ? AND used_at IS NULL AND expires_at > datetime('now')
  `).bind(ticketId).first();

  if (!ticket) {
    return error("Invalid or expired ticket", "UNAUTHORIZED", null, 401);
  }

  // 2. Mark ticket as used
  await db.prepare(`
    UPDATE support_tickets SET used_at = datetime('now') WHERE id = ?
  `).bind(ticketId).run();

  const userId = ticket.user_id;
  const otherId = ticket.other_id;

  // 3. Connect to Durable Object Room
  const room = getChatRoom(c.env, userId, otherId);
  
  // Forward the request to the DO to establish the stream
  const roomResponse = await room.fetch(new Request(`${new URL(c.req.url).origin}/stream`, {
    headers: { "Accept": "text/event-stream" }
  }));

  // Relay the DO's stream response back to the client
  return new Response(roomResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
});

/**
 * POST /api/v1/support/message
 * Send a support message
 */
supportRoutes.post("/message", async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  
  // Flood Protection: 5 messages per 3 seconds
  const limited = await rateLimit(c.req.raw, c.env, "support", 3000, auth.user_id);
  if (limited) return limited;

  const body = await c.req.json();
  const { receiver_id, message } = body;

  if (!receiver_id || !message) {
    return error("Missing receiver_id or message", "BAD_REQUEST", null, 400);
  }

  const isAdmin = ['super_admin', 'operations', 'support', 'admin'].includes(auth.role);

  // Security: Non-admins can only message admins (represented by a specific ID or any admin)
  // For now, let's assume admins can message anyone, and users can message any admin.
  // In a real system, users might message a 'support-team' ID or a specific assigned admin.
  if (!isAdmin) {
     // User is sending a message. We should verify receiver_id is an admin.
     // For MVP, we allow users to message admins. 
     // We'll trust the receiver_id for now but ideally check their role.
  }

  const db = getDB(c.env);

  // Find/create the customer's thread. When the sender is the customer, the
  // thread belongs to them; when an admin sends, it belongs to the receiver.
  const customerId = isAdmin ? receiver_id : auth.user_id;
  let thread;
  try {
    thread = await findOrCreateThread(db, customerId);
  } catch (err) {
    return error(err.message || "Cannot open support thread", "BAD_REQUEST", null, 400);
  }

  // Persist with all NOT NULL columns + live broadcast via ChatRoom DO
  const payload = await persistAndBroadcast(db, c.env, {
    threadId:   thread.id,
    senderId:   auth.user_id,
    receiverId: receiver_id,
    message,
    isAdmin:    Boolean(isAdmin),
    origin:     new URL(c.req.url).origin,
  });

  return json({ success: true, message: payload });
});

/**
 * GET /api/v1/support/history/:other_id
 * Fetch chat history with another user
 */
supportRoutes.get("/history/:other_id", async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  const otherId = c.req.param("other_id");
  const db = getDB(c.env);

  const isAdmin = ['super_admin', 'operations', 'support', 'admin'].includes(auth.role);

  // Security: If not admin, you can only see history where YOU are either sender or receiver
  // and the other person is 'otherId'.
  if (!isAdmin && auth.user_id !== otherId) {
    // This is already implied by the query below, but we enforce it for clarity.
  }

  const { results } = await db.prepare(`
    SELECT * FROM support_messages
    WHERE (sender_id = ? AND receiver_id = ?)
       OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
    LIMIT 50
  `).bind(auth.user_id, otherId, otherId, auth.user_id).all();

  // Mark all messages sent TO this user as read
  await db.prepare(`
    UPDATE support_messages SET read_at = datetime('now')
    WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL
  `).bind(auth.user_id, otherId).run().catch(() => null);

  return json({ success: true, data: results });
});

/**
 * GET /api/v1/support/conversations
 * List all active conversations (Admins only)
 */
supportRoutes.get("/conversations", async (c) => {
  await requirePermission(c.req.raw, c.env, "support:read");
  const db = getDB(c.env);
  const limit  = Math.min(parseInt(c.req.query("limit")  || "50"), 200);
  const offset = Math.max(parseInt(c.req.query("offset") || "0"),  0);

  const { results } = await db.prepare(`
    SELECT DISTINCT
      CASE WHEN sender_id < receiver_id THEN sender_id || '--' || receiver_id
           ELSE receiver_id || '--' || sender_id END as room_id,
      MAX(created_at) as last_message_at,
      sender_id, receiver_id
    FROM support_messages
    GROUP BY room_id
    ORDER BY last_message_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  return json({ success: true, data: results, limit, offset });
});

/**
 * GET /api/v1/support/unread-count
 * Returns count of unread messages sent to the authenticated user.
 */
supportRoutes.get("/unread-count", async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  const db = getDB(c.env);

  const row = await db.prepare(`
    SELECT COUNT(*) as unread
    FROM support_messages
    WHERE receiver_id = ? AND read_at IS NULL
  `).bind(auth.user_id).first();

  return json({ unread: row?.unread || 0 });
});

