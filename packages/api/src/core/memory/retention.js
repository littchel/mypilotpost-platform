/**
 * myPilotPost — Memory Retention
 * Deletes old data per retention policy.
 * Called by the daily cron (0 3 * * *).
 *
 * Retention:
 *   memory_events   — 18 months
 *   memory_features — 24 months (computed_at)
 *   brand_memory    — indefinite
 *   memory_snapshots — 36 months
 */

import { getDB } from '../../lib/db.js';

export async function runRetention(env) {
  const db = getDB(env);

  const cuts = [
    ['memory_events',   'created_at',   '-18 months'],
    ['memory_features', 'computed_at',  '-24 months'],
    ['memory_snapshots','created_at',   '-36 months'],
  ];

  for (const [table, col, offset] of cuts) {
    try {
      const result = await db.prepare(`
        DELETE FROM ${table} WHERE ${col} < datetime('now', ?)
      `).bind(offset).run();
      if (result.changes > 0) {
        console.log(`[RETENTION] ${table}: deleted ${result.changes} rows older than ${offset}`);
      }
    } catch (e) {
      console.error(`[RETENTION] ${table}:`, e.message);
    }
  }
}
