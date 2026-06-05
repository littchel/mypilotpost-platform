/**
 * myPilotPost — Activity Log
 * Append-only timeline of team/content/client actions.
 */

import { json, error } from '../../lib/json.js';
import { getDB } from '../../lib/db.js';

export async function logActivity(env, {
  brand_id, actor_id, actor_name, actor_type = 'user',
  action, entity_type, entity_id, entity_label,
  before_state, after_state, metadata,
}) {
  const db = getDB(env);
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO activity_log (id, brand_id, actor_id, actor_name, actor_type, action, entity_type, entity_id, entity_label, before_state, after_state, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    id, brand_id, actor_id || null, actor_name || null, actor_type,
    action, entity_type || null, entity_id || null, entity_label || null,
    before_state ? JSON.stringify(before_state) : null,
    after_state  ? JSON.stringify(after_state)  : null,
    metadata     ? JSON.stringify(metadata)     : null,
  ).run().catch(e => console.error('[ACTIVITY]', e.message));
}

/** GET /api/customer/activity */
export async function getActivity(request, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const url = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get('limit'))  || 50, 100);
  const offset = parseInt(url.searchParams.get('offset')) || 0;
  const entity_type = url.searchParams.get('entity_type');
  const entity_id   = url.searchParams.get('entity_id');

  const db = getDB(env);
  let q = `SELECT id, actor_name, actor_type, action, entity_type, entity_id, entity_label, metadata, created_at
           FROM activity_log WHERE brand_id = ?`;
  const binds = [auth.brand_id];

  if (entity_type) { q += ' AND entity_type = ?'; binds.push(entity_type); }
  if (entity_id)   { q += ' AND entity_id = ?';   binds.push(entity_id); }

  q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await db.prepare(q).bind(...binds).all().catch(() => ({ results: [] }));
  return json({ data: results || [] });
}
