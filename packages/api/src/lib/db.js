// packages/api/src/lib/db.js
// Phase 1 + Phase 2 DB helpers (Cloudflare D1)

/**
 * Canonical DB accessor
 *
 * Rules:
 * - Always returns a D1Database instance
 * - Fails fast if binding is missing
 * - No side effects
 * - No implicit globals
 *
 * Binding name MUST match wrangler.toml:
 *   env.mypilotpost -> D1 Database
 */
export function getDB(env) {
  if (!env) {
    throw new Error("getDB called without env");
  }

  const db = env.mypilotpost;

  if (!db || typeof db.prepare !== "function") {
    throw new Error(
      "D1 binding 'mypilotpost' not found or invalid. Check wrangler.toml bindings."
    );
  }

  return db;
}

/**
 * Legacy compatibility alias
 *
 * Canon:
 * - db(env) === getDB(env)
 * - Exists to support older modules
 * - DO NOT extend with additional logic
 */
export const db = getDB;
