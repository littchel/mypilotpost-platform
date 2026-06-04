/**
 * myPilotPost — Support Requests
 * User submits → stored → admin notified.
 * No ticket engine. No chat. No AI.
 */

import { json, error } from '../../lib/json.js';
import { getDB } from '../../lib/db.js';
import { sendEmail } from '../email/send-email.js';

const ADMIN_EMAIL  = 'support@mypilotpost.com';
const CATEGORIES   = ['technical', 'billing', 'platform', 'approval', 'bug'];

// ── POST /api/customer/support ────────────────────────────────────────────────
export async function createSupportRequest(req, env, auth) {
  const body = await req.json().catch(() => ({}));
  const { category, subject, message } = body;

  if (!CATEGORIES.includes(category)) return error('Invalid category', 400);
  if (!subject?.trim() || !message?.trim()) return error('subject and message required', 400);

  const db = getDB(env);
  const id = crypto.randomUUID();

  // Get user info
  let email = null, name = null;
  if (auth?.user_id) {
    const u = await db.prepare('SELECT email, full_name FROM users WHERE id = ?').bind(auth.user_id).first().catch(() => null);
    email = u?.email || null;
    name  = u?.full_name || null;
  }

  await db.prepare(`
    INSERT INTO support_requests (id, user_id, brand_id, email, name, category, subject, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, auth?.user_id || null, auth?.brand_id || null, email, name, category, subject, message).run();

  // Notify admin via email
  try {
    const html = `<p><strong>New support request</strong></p>
<p><strong>From:</strong> ${name || 'Unknown'} (${email || 'no email'})</p>
<p><strong>Category:</strong> ${category}</p>
<p><strong>Subject:</strong> ${subject}</p>
<p><strong>Message:</strong></p>
<pre style="background:#f1f5f9;padding:12px;border-radius:8px;white-space:pre-wrap">${message}</pre>
<p><a href="https://admin.mypilotpost.com">View in Admin Portal</a></p>`;
    await sendEmail({ to: ADMIN_EMAIL, subject: `[Support] ${category}: ${subject}`, html, env });
  } catch { /* non-fatal */ }

  // In-app notification for the user confirming receipt
  await db.prepare(`
    INSERT INTO notifications (id, brand_id, recipient_id, recipient_type, type, title, message, data, read, created_at)
    VALUES (?, ?, ?, 'customer', 'support_created', 'Support request received', ?, '{}', 0, datetime('now'))
  `).bind(crypto.randomUUID(), auth?.brand_id || null, auth?.user_id || null,
    `Your support request "${subject}" has been received. We'll respond within 24 hours.`).run().catch(() => {});

  return json({ success: true, request_id: id });
}

// ── GET /api/customer/support ─────────────────────────────────────────────────
export async function listSupportRequests(req, env, auth) {
  if (!auth?.user_id) return error('Unauthorized', 401);
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT id, category, subject, status, created_at, updated_at
    FROM support_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).bind(auth.user_id).all();
  return json({ data: results || [] });
}

// ── Admin: GET /api/v1/admin/support ─────────────────────────────────────────
export async function adminListSupport(req, env) {
  const db = getDB(env);
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'open';
  const { results } = await db.prepare(`
    SELECT id, user_id, email, name, category, subject, status, created_at
    FROM support_requests WHERE status = ? ORDER BY created_at DESC LIMIT 50
  `).bind(status).all();
  return json({ data: results || [] });
}

// ── Admin: PUT /api/v1/admin/support/:id ─────────────────────────────────────
export async function adminUpdateSupport(req, env) {
  const parts = req.url.split('/');
  const reqId = parts[parts.length - 1];
  const body  = await req.json().catch(() => ({}));
  const db    = getDB(env);

  const updates = [];
  const binds   = [];
  if (body.status)      { updates.push('status = ?');      binds.push(body.status); }
  if (body.admin_notes) { updates.push('admin_notes = ?'); binds.push(body.admin_notes); }
  if (body.status === 'resolved') { updates.push('resolved_at = datetime(\'now\')'); }
  updates.push('updated_at = datetime(\'now\')');
  binds.push(reqId);

  await db.prepare(`UPDATE support_requests SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  return json({ success: true });
}
