/**
 * myPilotPost — Teams & Invites
 * AUTHORITATIVE • SYSTEM CORE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";
import { notify } from "../communication/notify.js";
import { can } from "../team/permissions.js";
import { getCurrentPlan } from "../billing/billing.js";

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

  // Check permissions via brand_users (canonical membership)
  const member = await db.prepare(`SELECT role FROM brand_users WHERE brand_id = ? AND user_id = ?`).bind(brand_id, user_id).first();
  if (!member || !can(member.role, 'invite')) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  const brand = await db.prepare('SELECT owner_user_id, name FROM brands WHERE id = ?').bind(brand_id).first().catch(() => null);
  if (!brand) return error("Brand not found", "NOT_FOUND", null, 404);
  const owner_id = brand.owner_user_id;

  // Enforce pricing plan seats limits
  const plan = await getCurrentPlan(db, owner_id);
  const usersRow = await db.prepare(`
    SELECT COUNT(DISTINCT bu.user_id) as count
    FROM brand_users bu
    JOIN brands b ON bu.brand_id = b.id
    WHERE b.owner_user_id = ?
  `).bind(owner_id).first();
  const currentCount = usersRow?.count || 0;

  if (currentCount >= plan.user_limit) {
    return error(`User limit reached. Your ${plan.name} plan supports up to ${plan.user_limit} user seats.`, "FORBIDDEN", null, 403);
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  await db.prepare(`
    INSERT INTO invites (id, brand_id, email, role, token, created_by, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, brand_id, email, role, token, user_id, expiresAt).run();

  await emitEvent(env, 'invite_created', { brand_id, user_id, metadata: { email, role, token } });

  // Notify invitee via communication engine
  const sender = await db.prepare('SELECT full_name FROM users WHERE id = ?').bind(user_id).first().catch(() => null);
  const inviteUrl = `https://app.mypilotpost.com/register?invite=${token}`;
  notify(env, {
    event: 'invite_sent',
    brandId: brand_id,
    recipientEmail: email,
    title: `You're invited to ${brand?.name || 'a brand'}`,
    message: `${sender?.full_name || 'Someone'} invited you to collaborate on ${brand?.name || 'myPilotPost'} as ${role}.`,
    data: { inviter_name: sender?.full_name || '', brand_name: brand?.name || '', role, invite_url: inviteUrl },
    link: inviteUrl,
  }).catch(() => {});

  return json({ success: true, invite_id: id });
}

/**
 * GET /api/customer/invites
 */
export async function getInvites(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT id, email, role, status, token, created_at, expires_at
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

  // Check seat limits before accepting
  const brand = await db.prepare('SELECT owner_user_id FROM brands WHERE id = ?').bind(invite.brand_id).first().catch(() => null);
  if (brand) {
    const owner_id = brand.owner_user_id;
    const plan = await getCurrentPlan(db, owner_id);
    const usersRow = await db.prepare(`
      SELECT COUNT(DISTINCT bu.user_id) as count
      FROM brand_users bu
      JOIN brands b ON bu.brand_id = b.id
      WHERE b.owner_user_id = ?
    `).bind(owner_id).first();
    const currentCount = usersRow?.count || 0;

    if (currentCount >= plan.user_limit) {
      return error(`The brand has reached its user seat limit (${plan.user_limit}). Contact the owner to upgrade.`, "FORBIDDEN", null, 403);
    }
  }

  // Verify the accepting user's email matches the invite's target email.
  // This prevents a token interceptor from granting access to a different account.
  const acceptingUser = await db.prepare(`SELECT email FROM users WHERE id = ?`).bind(user_id).first();
  if (!acceptingUser) return error("User not found", "NOT_FOUND", null, 404);
  if (acceptingUser.email.toLowerCase() !== invite.email.toLowerCase()) {
    return error("This invite was sent to a different email address", "FORBIDDEN", null, 403);
  }

  // 1–3. Atomic membership grant.
  // brand_users is the canonical auth table (checked by requireAuth middleware).
  // Write invite.role to BOTH tables so the middleware sees the correct role immediately.
  const memberId = crypto.randomUUID();
  await db.batch([
    db.prepare(`UPDATE invites SET status = 'accepted' WHERE id = ?`).bind(invite.id),
    db.prepare(`
      INSERT INTO team_members (id, brand_id, user_id, role)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(brand_id, user_id) DO UPDATE SET role = EXCLUDED.role
    `).bind(memberId, invite.brand_id, user_id, invite.role),
    db.prepare(`
      INSERT INTO brand_users (user_id, brand_id, role, created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, brand_id) DO UPDATE SET role = excluded.role
    `).bind(user_id, invite.brand_id, invite.role),
  ]);

  // 4. Emit event
  await emitEvent(env, 'invite_accepted', {
    brand_id: invite.brand_id,
    user_id: user_id,
    metadata: { role: invite.role }
  });

  return json({ success: true, brand_id: invite.brand_id });
}
