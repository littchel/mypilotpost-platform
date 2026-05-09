/**
 * myPilotPost — Teams & Invites
 * AUTHORITATIVE • SYSTEM CORE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";

/**
 * POST /api/customer/invites
 * Create a new invitation for a brand
 */
export async function createInvite(request, env, auth) {
  const { brand_id, user_id } = auth;
  const body = await request.json();
  const { email, role } = body;

  if (!email || !role) return error("Email and role required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  // Check permissions (Only owner/admin)
  const member = await db.prepare(`SELECT role FROM team_members WHERE brand_id = ? AND user_id = ?`).bind(brand_id, user_id).first();
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  await db.prepare(`
    INSERT INTO invites (id, brand_id, email, role, token, created_by, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, brand_id, email, role, token, user_id, expiresAt).run();

  // Emit event (Notification system can pick this up to send email)
  await emitEvent(env, 'invite_created', {
    brand_id,
    user_id,
    metadata: { email, role, token }
  });

  return json({ success: true, invite_id: id });
}

/**
 * GET /api/customer/invites
 */
export async function getInvites(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT id, email, role, status, created_at, expires_at
    FROM invites
    WHERE brand_id = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).bind(brand_id).all();

  return json({ data: results });
}

/**
 * GET /api/customer/team
 */
export async function getTeam(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT tm.id, tm.role, tm.created_at, u.full_name, u.email
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.brand_id = ?
    ORDER BY tm.role ASC
  `).bind(brand_id).all();

  return json({ data: results });
}

/**
 * POST /api/customer/invites/accept (Publicly accessible but token validated)
 */
export async function acceptInvite(request, env) {
  const body = await request.json();
  const { token, user_id } = body; // user_id is the person accepting (already logged in)

  if (!token || !user_id) return error("Token and user_id required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  const invite = await db.prepare(`
    SELECT * FROM invites WHERE token = ? AND status = 'pending'
  `).bind(token).first();

  if (!invite) return error("Invalid or expired invite", "NOT_FOUND", null, 404);
  if (new Date(invite.expires_at) < new Date()) {
    await db.prepare(`UPDATE invites SET status = 'expired' WHERE id = ?`).bind(invite.id).run();
    return error("Invite has expired", "GONE", null, 410);
  }

  // 1. Mark invite accepted
  await db.prepare(`UPDATE invites SET status = 'accepted' WHERE id = ?`).bind(invite.id).run();

  // 2. Add to team_members
  const memberId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO team_members (id, brand_id, user_id, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(brand_id, user_id) DO UPDATE SET role = EXCLUDED.role
  `).bind(memberId, invite.brand_id, user_id, invite.role).run();

  // 3. Emit event
  await emitEvent(env, 'invite_accepted', {
    brand_id: invite.brand_id,
    user_id: user_id,
    metadata: { role: invite.role }
  });

  return json({ success: true, brand_id: invite.brand_id });
}
