/**
 * myPilotPost — Client Management
 * External stakeholders who receive approvals and reports without app login.
 */

import { json, error } from '../../lib/json.js';
import { getDB } from '../../lib/db.js';
import { can } from './permissions.js';
import { logActivity } from './activity.js';
import { deliver } from '../communication/engine.js';
import { emit, TOOLS, EVENTS } from '../events/emit.js';

const APP_URL = 'https://app.mypilotpost.com';

async function memberRole(db, brandId, userId) {
  // Read from brand_users — the auth-authoritative table (same source as requireAuth middleware).
  const m = await db.prepare('SELECT role FROM brand_users WHERE brand_id = ? AND user_id = ?').bind(brandId, userId).first();
  return m?.role || null;
}

// ── GET /api/customer/clients ─────────────────────────────────────────────────
export async function listClients(req, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT c.id, c.name, c.email, c.phone, c.company, c.status, c.created_at,
           COUNT(DISTINCT cl.id) AS link_count
    FROM clients c
    LEFT JOIN client_links cl ON cl.client_id = c.id
    WHERE c.brand_id = ? AND c.status != 'archived'
    GROUP BY c.id
    ORDER BY c.name ASC
  `).bind(auth.brand_id).all();
  return json({ data: results || [] });
}

// ── POST /api/customer/clients ────────────────────────────────────────────────
export async function createClient(req, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const db = getDB(env);
  const role = await memberRole(db, auth.brand_id, auth.user_id);
  if (!can(role, 'manage_clients')) return error('Insufficient permissions', 403);

  const body = await req.json().catch(() => ({}));
  const { name, email, phone, company, notes } = body;
  if (!name) return error('name required', 400);

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO clients (id, brand_id, name, email, phone, company, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, auth.brand_id, name, email || null, phone || null, company || null, notes || null, auth.user_id).run();

  await logActivity(env, { brand_id: auth.brand_id, actor_id: auth.user_id, action: 'client.created', entity_type: 'client', entity_id: id, entity_label: name });
  emit(env, { tool: TOOLS.CLIENTS, event: EVENTS.CLIENT_ADDED, brandId: auth.brand_id, userId: auth.user_id });
  return json({ success: true, client_id: id });
}

// ── PUT /api/customer/clients/:id ─────────────────────────────────────────────
export async function updateClient(req, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const parts = req.url.split('/');
  const clientId = parts[parts.length - 1];
  const db = getDB(env);

  const existing = await db.prepare('SELECT * FROM clients WHERE id = ? AND brand_id = ?').bind(clientId, auth.brand_id).first();
  if (!existing) return error('Not found', 404);

  const body = await req.json().catch(() => ({}));
  const { name, email, phone, company, notes, status } = body;

  await db.prepare(`
    UPDATE clients SET name=COALESCE(?,name), email=COALESCE(?,email), phone=COALESCE(?,phone),
    company=COALESCE(?,company), notes=COALESCE(?,notes), status=COALESCE(?,status), updated_at=datetime('now')
    WHERE id = ?
  `).bind(name||null, email||null, phone||null, company||null, notes||null, status||null, clientId).run();

  await logActivity(env, { brand_id: auth.brand_id, actor_id: auth.user_id, action: 'client.updated', entity_type: 'client', entity_id: clientId, entity_label: name || existing.name, before_state: existing });
  return json({ success: true });
}

// ── DELETE /api/customer/clients/:id ─────────────────────────────────────────
export async function archiveClient(req, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const parts = req.url.split('/');
  const clientId = parts[parts.length - 1];
  const db = getDB(env);

  await db.prepare(`UPDATE clients SET status='archived', updated_at=datetime('now') WHERE id = ? AND brand_id = ?`).bind(clientId, auth.brand_id).run();
  await logActivity(env, { brand_id: auth.brand_id, actor_id: auth.user_id, action: 'client.archived', entity_type: 'client', entity_id: clientId });
  return json({ success: true });
}

// ── POST /api/customer/clients/:id/send ──────────────────────────────────────
// Send an approval or report link to a client via email and/or WhatsApp.
export async function sendToClient(req, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const parts = req.url.split('/');
  const clientId = parts[parts.length - 2]; // /clients/:id/send
  const db = getDB(env);

  const client = await db.prepare('SELECT * FROM clients WHERE id = ? AND brand_id = ?').bind(clientId, auth.brand_id).first();
  if (!client) return error('Client not found', 404);

  const body = await req.json().catch(() => ({}));
  const { type = 'approval', entity_id, channels = ['email'], message, expiry_hours = 72 } = body;

  // Generate a secure token
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + expiry_hours * 3600_000).toISOString();
  const linkId = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO client_links (id, client_id, brand_id, token, type, entity_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(linkId, clientId, auth.brand_id, token, type, entity_id || null, expiresAt).run();

  const brand = await db.prepare('SELECT name FROM brands WHERE id = ?').bind(auth.brand_id).first();
  const brand_name = brand?.name || 'Your Brand';

  let linkUrl;
  if (type === 'approval') {
    // Token is the path segment — resolves to content_id via content_shares lookup
    linkUrl = `${APP_URL}/public/approval/${token}`;
  } else if (type === 'report' && entity_id) {
    linkUrl = `${APP_URL}/public/report/${entity_id}?token=${token}`;
  } else {
    linkUrl = `${APP_URL}/public/review?token=${token}`;
  }

  // Store the token hash so the server can validate the link
  const tokenHash = await (async () => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  })();

  if (type === 'approval' && entity_id) {
    await db.prepare(`
      INSERT INTO content_shares (id, brand_id, content_id, share_type, access_token_hash, expires_at)
      VALUES (?, ?, ?, 'client_review', ?, ?)
      ON CONFLICT(access_token_hash) DO NOTHING
    `).bind(crypto.randomUUID(), auth.brand_id, entity_id, tokenHash, expiresAt).run();
  }

  // Deliver via requested channels
  if (channels.includes('email') && client.email) {
    await deliver({ type, to: { email: client.email }, data: {
      brand_name,
      reviewer_name: client.name,
      recipient_name: client.name,
      content_title: body.content_title || 'Content Review',
      report_title: body.report_title || 'Report',
      approval_url: linkUrl,
      report_url: linkUrl,
      notes: message,
    }, env });
  }

  if (channels.includes('whatsapp') && client.phone) {
    await deliver({ type, to: { phone: client.phone }, data: {
      brand_name,
      reviewer_name: client.name,
      content_title: body.content_title || 'Content Review',
      report_title: body.report_title || 'Report',
      approval_url: linkUrl,
      report_url: linkUrl,
    }, env });
  }

  await logActivity(env, { brand_id: auth.brand_id, actor_id: auth.user_id, action: `client.${type}_sent`, entity_type: 'client', entity_id: clientId, entity_label: client.name, metadata: { channels, type, entity_id } });

  return json({ success: true, link: linkUrl, token, expires_at: expiresAt });
}

// ── GET /api/customer/clients/:id/links ──────────────────────────────────────
export async function getClientLinks(req, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const parts = req.url.split('/');
  const clientId = parts[parts.length - 2];
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT id, token, type, entity_id, expires_at, accessed_at, created_at
    FROM client_links WHERE client_id = ? AND brand_id = ?
    ORDER BY created_at DESC LIMIT 20
  `).bind(clientId, auth.brand_id).all();
  return json({ data: results || [] });
}
