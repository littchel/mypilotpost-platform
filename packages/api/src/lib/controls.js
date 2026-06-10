// packages/api/src/lib/controls.js
// Runtime kill-switch helper. Fail-open: if the table is unavailable, always returns false.

/**
 * Returns true if a platform control is active (i.e. feature is paused/maintenance on).
 * Reads from the platform_controls table seeded by migration 134.
 */
export async function isControlActive(db, key) {
  try {
    const row = await db.prepare(
      'SELECT enabled FROM platform_controls WHERE key = ? LIMIT 1'
    ).bind(key).first();
    return row?.enabled === 1;
  } catch {
    // Fail-open: if DB is unavailable, allow the operation to proceed.
    return false;
  }
}
