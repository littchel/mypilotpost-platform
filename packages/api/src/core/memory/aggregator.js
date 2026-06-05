/**
 * myPilotPost — Memory Aggregator
 * Computes daily/weekly/monthly snapshots from features + memory.
 * Called by the existing cron worker (scheduled.js).
 * No recalculation of snapshots — write-once per period.
 */

import { getDB } from '../../lib/db.js';
import { getFeatureValues, computeApprovalRate } from './features.js';

export async function runDailyAggregation(env) {
  const db     = getDB(env);
  const today  = new Date().toISOString().slice(0, 10);

  // Get all brands with memory activity
  const { results: brands } = await db.prepare(`
    SELECT DISTINCT brand_id FROM memory_events
    WHERE created_at >= datetime('now', '-1 day')
  `).all().catch(() => ({ results: [] }));

  for (const { brand_id } of (brands || [])) {
    await snapshotBrand(db, brand_id, today, 'daily').catch(() => {});
  }
}

export async function runWeeklyAggregation(env) {
  const db   = getDB(env);
  const week = getWeekKey();

  const { results: brands } = await db.prepare(`
    SELECT DISTINCT brand_id FROM memory_events
    WHERE created_at >= datetime('now', '-7 days')
  `).all().catch(() => ({ results: [] }));

  for (const { brand_id } of (brands || [])) {
    await snapshotBrand(db, brand_id, week, 'weekly').catch(() => {});
  }
}

async function snapshotBrand(db, brandId, date, period) {
  const existing = await db.prepare(`SELECT id FROM memory_snapshots WHERE brand_id=? AND snapshot_date=? AND period=?`).bind(brandId, date, period).first().catch(() => null);
  if (existing) return; // already snapshotted

  const features = await getFeatureValues(db, brandId, period === 'daily' ? '7d' : period === 'weekly' ? '30d' : '90d');
  const approvalRate = await computeApprovalRate(db, brandId).catch(() => null);

  // Event counts for this period
  const since = period === 'daily' ? '1 day' : period === 'weekly' ? '7 days' : '30 days';
  const { results: eventCounts } = await db.prepare(`
    SELECT event, COUNT(*) as count FROM memory_events
    WHERE brand_id=? AND created_at >= datetime('now', ?)
    GROUP BY event
  `).bind(brandId, `-${since}`).all().catch(() => ({ results: [] }));

  // Brand memory for this brand
  const { results: memRows } = await db.prepare(`
    SELECT namespace, key, value, confidence FROM brand_memory WHERE brand_id=?
  `).bind(brandId).all().catch(() => ({ results: [] }));

  const memory = {};
  for (const r of (memRows || [])) {
    if (!memory[r.namespace]) memory[r.namespace] = {};
    try { memory[r.namespace][r.key] = { v: JSON.parse(r.value), c: r.confidence }; }
    catch { memory[r.namespace][r.key] = { v: r.value, c: r.confidence }; }
  }

  const payload = {
    features,
    approval_rate: approvalRate,
    event_counts: Object.fromEntries((eventCounts || []).map(r => [r.event, r.count])),
    memory,
    generated_at: new Date().toISOString(),
  };

  await db.prepare(`
    INSERT INTO memory_snapshots (id, brand_id, snapshot_date, period, payload, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id, snapshot_date, period) DO NOTHING
  `).bind(crypto.randomUUID(), brandId, date, period, JSON.stringify(payload)).run();
}

function getWeekKey() {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}
