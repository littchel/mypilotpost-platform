// packages/api/src/core/support/admin.js
// Admin support domain — canonical tables support_threads + support_messages.
// Replaces the legacy adminListSupport/adminUpdateSupport that queried the
// non-existent support_requests table.

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logAdminAction } from "../../lib/admin_logger.js";
import { sendEmail } from "../email/send-email.js";
import { supportReplyEmail, ticketResolvedEmail } from "../email/templates/index.js";
import { findOrCreateThread, persistAndBroadcast } from "./threads.js";

const VALID_STATUSES   = ["open", "in_progress", "resolved", "closed"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];
const APP_URL = "https://app.mypilotpost.com?tab=support";

// ── GET /api/v1/admin/support/requests ───────────────────────────────────────
// Ticket list = support_threads + customer + brand + last message + unread count.
export async function adminListThreads(req, env) {
  const db  = getDB(env);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  let where = "";
  const binds = [];
  if (status && VALID_STATUSES.includes(status)) {
    where = "WHERE st.status = ?";
    binds.push(status);
  }

  const { results } = await db.prepare(`
    SELECT
      st.id, st.brand_id, st.customer_id, st.status, st.priority,
      st.created_at, st.closed_at, st.assigned_admin_id,
      b.name  AS brand_name,
      u.email AS user_email,
      u.first_name, u.last_name,
      (SELECT message    FROM support_messages WHERE thread_id = st.id ORDER BY created_at DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM support_messages WHERE thread_id = st.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
      (SELECT COUNT(*)   FROM support_messages WHERE thread_id = st.id AND is_admin_msg = 0 AND read_at IS NULL) AS unread_count
    FROM support_threads st
    LEFT JOIN brands b ON b.id = st.brand_id
    LEFT JOIN users  u ON u.id = st.customer_id
    ${where}
    ORDER BY COALESCE(
      (SELECT created_at FROM support_messages WHERE thread_id = st.id ORDER BY created_at DESC LIMIT 1),
      st.created_at
    ) DESC
    LIMIT 100
  `).bind(...binds).all();

  // Normalize to the shape the admin UI expects (id, subject, status, priority, user_email…)
  const data = (results || []).map(t => ({
    id:            t.id,
    user_id:       t.customer_id,
    user_email:    t.user_email,
    brand_id:      t.brand_id,
    brand_name:    t.brand_name,
    subject:       t.brand_name ? `${t.brand_name} support` : "Support thread",
    category:      "support",
    status:        t.status,
    priority:      t.priority,
    assigned_admin_id: t.assigned_admin_id,
    last_message:  t.last_message,
    last_message_at: t.last_message_at,
    unread_count:  t.unread_count || 0,
    created_at:    t.created_at,
    updated_at:    t.last_message_at || t.created_at,
  }));

  return json({ data });
}

// ── GET /api/v1/admin/support/:threadUserId ──────────────────────────────────
// Thread + full message timeline for a specific customer.
export async function adminGetThreadByUser(req, env, customerId) {
  const db = getDB(env);

  const thread = await db.prepare(`
    SELECT st.id, st.brand_id, st.customer_id, st.status, st.priority,
           st.created_at, st.closed_at, st.assigned_admin_id,
           b.name AS brand_name, u.email AS user_email, u.first_name, u.last_name
    FROM support_threads st
    LEFT JOIN brands b ON b.id = st.brand_id
    LEFT JOIN users  u ON u.id = st.customer_id
    WHERE st.customer_id = ?
    ORDER BY st.created_at DESC
    LIMIT 1
  `).bind(customerId).first().catch(() => null);

  const { results: messages } = await db.prepare(`
    SELECT id, thread_id, sender_type, sender_id, receiver_id, message,
           is_admin_msg, read_at, created_at
    FROM support_messages
    WHERE thread_id IN (SELECT id FROM support_threads WHERE customer_id = ?)
       OR sender_id = ? OR receiver_id = ?
    ORDER BY created_at ASC
    LIMIT 200
  `).bind(customerId, customerId, customerId).all().catch(() => ({ results: [] }));

  // Mark inbound (customer→admin) messages as read
  await db.prepare(
    "UPDATE support_messages SET read_at = datetime('now') WHERE receiver_id = ? IS NULL OR (sender_id = ? AND is_admin_msg = 0 AND read_at IS NULL)"
  ).bind(customerId, customerId).run().catch(() => {});

  return json({
    thread: thread || null,
    messages: (messages || []).map(m => ({
      ...m,
      direction: m.is_admin_msg ? "outbound" : "inbound",
      delivery_status: m.read_at ? "read" : "delivered",
    })),
  });
}

// ── PUT /api/v1/admin/support/requests/:id ───────────────────────────────────
// Update thread status / priority / assignment. Sends resolved email on resolve.
export async function adminUpdateThread(req, env, auth, threadId) {
  const db   = getDB(env);
  const body = await req.json().catch(() => ({}));

  const thread = await db.prepare(`
    SELECT st.id, st.status, st.customer_id, st.brand_id, b.name AS brand_name,
           u.email AS user_email, u.first_name
    FROM support_threads st
    LEFT JOIN brands b ON b.id = st.brand_id
    LEFT JOIN users  u ON u.id = st.customer_id
    WHERE st.id = ?
  `).bind(threadId).first().catch(() => null);
  if (!thread) return error("Support thread not found", "NOT_FOUND", null, 404);

  const updates = [];
  const binds   = [];

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status))
      return error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, "BAD_REQUEST", null, 400);
    updates.push("status = ?");
    binds.push(body.status);
    if (body.status === "resolved" || body.status === "closed") {
      updates.push("closed_at = datetime('now')");
    }
  }
  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority))
      return error(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}`, "BAD_REQUEST", null, 400);
    updates.push("priority = ?");
    binds.push(body.priority);
  }
  if (body.assigned_admin_id !== undefined) {
    updates.push("assigned_admin_id = ?");
    binds.push(body.assigned_admin_id || auth.user_id);
  }

  if (!updates.length) return error("No valid fields to update", "BAD_REQUEST", null, 400);

  binds.push(threadId);
  await db.prepare(`UPDATE support_threads SET ${updates.join(", ")} WHERE id = ?`).bind(...binds).run();

  await logAdminAction(env, auth, "update_support_thread", "support_thread", threadId, {
    before: { status: thread.status },
    after:  { status: body.status ?? thread.status, priority: body.priority },
  });

  // Ticket-resolved email (real send)
  if (body.status === "resolved" && thread.user_email) {
    try {
      // Fetch thread chat history
      const { results: messages } = await db.prepare(`
        SELECT sender_type, message, created_at FROM support_messages
        WHERE thread_id = ?
        ORDER BY created_at ASC
      `).bind(threadId).all().catch(() => ({ results: [] }));

      let transcriptHtml = "";
      let transcriptText = "";

      if (messages && messages.length > 0) {
        transcriptHtml = `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 13px; line-height: 1.5; color: #334155; text-align: left;">
            <div style="font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; text-transform: uppercase; font-size: 11px; color: #64748b;">Conversation Transcript</div>
            ${messages.map(m => {
              const sender = m.sender_type === "admin" ? "Support Agent" : "You";
              const time = new Date(m.created_at).toLocaleString();
              return `<div style="margin-bottom: 10px;"><strong>[${time}] ${sender}:</strong><br/>${m.message}</div>`;
            }).join("")}
          </div>
        `;
        transcriptText = `\n\nCONVERSATION TRANSCRIPT:\n` + messages.map(m => {
          const sender = m.sender_type === "admin" ? "Support Agent" : "You";
          const time = new Date(m.created_at).toLocaleString();
          return `[${time}] ${sender}: ${m.message}`;
        }).join("\n");
      }

      const tpl = ticketResolvedEmail({
        first_name: thread.first_name,
        subject_line: thread.brand_name ? `${thread.brand_name} support` : "",
        thread_url: APP_URL,
        transcriptHtml,
      });

      await sendEmail({ 
        to: thread.user_email, 
        subject: tpl.subject, 
        html: tpl.html, 
        text: tpl.text + transcriptText, 
        env 
      });
    } catch (err) {
      console.error("[SUPPORT] resolved email failed", err);
    }
  }

  return json({ success: true });
}

// ── POST /api/v1/admin/support/message ───────────────────────────────────────
// Admin → customer reply. Find/create thread, persist, broadcast live, email.
export async function adminSendMessage(req, env, auth) {
  const db   = getDB(env);
  const body = await req.json().catch(() => ({}));
  const { receiver_id, message } = body;
  if (!receiver_id || !message?.trim())
    return error("receiver_id and message required", "BAD_REQUEST", null, 400);

  // Find or create the customer's thread
  let thread;
  try {
    thread = await findOrCreateThread(db, receiver_id, body.brand_id || null);
  } catch (err) {
    return error(err.message || "Cannot open support thread", "BAD_REQUEST", null, 400);
  }

  const origin = new URL(req.url).origin;
  const payload = await persistAndBroadcast(db, env, {
    threadId:   thread.id,
    senderId:   auth.user_id,
    receiverId: receiver_id,
    message:    message.trim(),
    isAdmin:    true,
    origin,
  });

  await logAdminAction(env, auth, "send_support_message", "support_thread", thread.id, {
    receiver_id, message_id: payload.id,
  });

  return json({ success: true, id: payload.id, thread_id: thread.id, message: payload });
}
