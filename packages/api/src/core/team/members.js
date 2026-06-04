/**
 * myPilotPost — Team Members (extended)
 * Adds role update, remove, and last_active tracking.
 * Works alongside existing teams/handlers.js (does not replace it).
 */

import { json, error } from '../../lib/json.js';
import { getDB } from '../../lib/db.js';
import { can, ASSIGNABLE_ROLES } from './permissions.js';
import { logActivity } from './activity.js';

async function callerRole(db, brandId, userId) {
  const m = await db.prepare('SELECT role FROM team_members WHERE brand_id = ? AND user_id = ?').bind(brandId, userId).first();
  return m?.role || null;
}

// ── PUT /api/customer/team/:member_id ── update role ─────────────────────────
export async function updateMemberRole(req, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const parts = req.url.split('/');
  const memberId = parts[parts.length - 1];

  const body = await req.json().catch(() => ({}));
  const { role } = body;

  if (!ASSIGNABLE_ROLES.includes(role)) return error('Invalid role', 400);

  const db = getDB(env);
  const callerR = await callerRole(db, auth.brand_id, auth.user_id);
  if (!can(callerR, 'invite')) return error('Insufficient permissions', 403);

  const member = await db.prepare('SELECT user_id, role FROM team_members WHERE id = ? AND brand_id = ?').bind(memberId, auth.brand_id).first();
  if (!member) return error('Member not found', 404);
  if (member.role === 'owner') return error('Cannot change owner role', 403);

  await db.prepare(`UPDATE team_members SET role = ?, updated_at = datetime('now') WHERE id = ?`).bind(role, memberId).run();
  await logActivity(env, { brand_id: auth.brand_id, actor_id: auth.user_id, action: 'member.role_changed', entity_type: 'member', entity_id: memberId, before_state: { role: member.role }, after_state: { role } });
  return json({ success: true });
}

// ── DELETE /api/customer/team/:member_id ── remove member ─────────────────────
export async function removeMember(req, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const parts = req.url.split('/');
  const memberId = parts[parts.length - 1];

  const db = getDB(env);
  const callerR = await callerRole(db, auth.brand_id, auth.user_id);
  if (!can(callerR, 'remove_member')) return error('Insufficient permissions', 403);

  const member = await db.prepare('SELECT user_id, role FROM team_members WHERE id = ? AND brand_id = ?').bind(memberId, auth.brand_id).first();
  if (!member) return error('Member not found', 404);
  if (member.role === 'owner') return error('Cannot remove owner', 403);

  await db.prepare('DELETE FROM team_members WHERE id = ?').bind(memberId).run();
  await logActivity(env, { brand_id: auth.brand_id, actor_id: auth.user_id, action: 'member.removed', entity_type: 'member', entity_id: memberId });
  return json({ success: true });
}

// ── DELETE /api/customer/invites/:id ── revoke invite ──────────────────────────
export async function revokeInvite(req, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const parts = req.url.split('/');
  const inviteId = parts[parts.length - 1];
  const db = getDB(env);

  const callerR = await callerRole(db, auth.brand_id, auth.user_id);
  if (!can(callerR, 'invite')) return error('Insufficient permissions', 403);

  await db.prepare(`UPDATE invites SET status = 'revoked' WHERE id = ? AND brand_id = ?`).bind(inviteId, auth.brand_id).run();
  return json({ success: true });
}
