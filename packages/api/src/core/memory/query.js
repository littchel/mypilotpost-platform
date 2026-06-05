/**
 * myPilotPost — Memory Query API
 * Read-only. No prediction. No inference.
 * getMemory(), getFeatures(), getSnapshot()
 */

import { json, error } from '../../lib/json.js';
import { getDB } from '../../lib/db.js';

/** GET /api/customer/memory?namespace=brand */
export async function getMemory(request, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const db  = getDB(env);
  const url = new URL(request.url);
  const ns  = url.searchParams.get('namespace');

  let q = 'SELECT namespace, key, value, confidence, source, updated_at FROM brand_memory WHERE brand_id=?';
  const binds = [auth.brand_id];
  if (ns) { q += ' AND namespace=?'; binds.push(ns); }
  q += ' ORDER BY namespace, key';

  const { results } = await db.prepare(q).bind(...binds).all();

  const out = {};
  for (const r of (results || [])) {
    if (!out[r.namespace]) out[r.namespace] = {};
    try { out[r.namespace][r.key] = { value: JSON.parse(r.value), confidence: r.confidence, source: r.source, updated_at: r.updated_at }; }
    catch { out[r.namespace][r.key] = { value: r.value, confidence: r.confidence, source: r.source, updated_at: r.updated_at }; }
  }
  return json({ data: out });
}

/** GET /api/customer/features?window=7d */
export async function getFeatures(request, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const db     = getDB(env);
  const url    = new URL(request.url);
  const window = url.searchParams.get('window') || 'all_time';

  const { results } = await db.prepare(`
    SELECT feature, value, window, computed_at FROM memory_features
    WHERE brand_id=? AND window=? ORDER BY feature
  `).bind(auth.brand_id, window).all();

  const features = Object.fromEntries((results || []).map(r => {
    try { return [r.feature, { value: JSON.parse(r.value), computed_at: r.computed_at }]; }
    catch { return [r.feature, { value: r.value, computed_at: r.computed_at }]; }
  }));

  return json({ data: features, window });
}

/** GET /api/customer/memory/snapshot?date=2026-06-04&period=daily */
export async function getSnapshot(request, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const db     = getDB(env);
  const url    = new URL(request.url);
  const date   = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const period = url.searchParams.get('period') || 'daily';

  const row = await db.prepare(`
    SELECT payload, snapshot_date, period, created_at FROM memory_snapshots
    WHERE brand_id=? AND snapshot_date=? AND period=?
  `).bind(auth.brand_id, date, period).first();

  if (!row) {
    // Return latest available
    const latest = await db.prepare(`
      SELECT payload, snapshot_date, period, created_at FROM memory_snapshots
      WHERE brand_id=? AND period=? ORDER BY snapshot_date DESC LIMIT 1
    `).bind(auth.brand_id, period).first();
    if (!latest) return json({ data: null, message: 'No snapshot available yet' });
    return json({ data: { ...JSON.parse(latest.payload), snapshot_date: latest.snapshot_date, period: latest.period } });
  }

  return json({ data: { ...JSON.parse(row.payload), snapshot_date: row.snapshot_date, period: row.period } });
}

/** GET /api/customer/memory/events?limit=50 */
export async function getEvents(request, env, auth) {
  if (!auth?.brand_id) return error('Unauthorized', 401);
  const db  = getDB(env);
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const tool  = url.searchParams.get('tool');

  let q = 'SELECT id, tool, event, value, metadata, created_at FROM memory_events WHERE brand_id=?';
  const binds = [auth.brand_id];
  if (tool) { q += ' AND tool=?'; binds.push(tool); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  binds.push(limit);

  const { results } = await db.prepare(q).bind(...binds).all();
  return json({ data: results || [] });
}
