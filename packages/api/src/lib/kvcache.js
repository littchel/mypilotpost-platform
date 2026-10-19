// packages/api/src/lib/kvcache.js
//
// Thin helpers over a Cloudflare KV namespace, used to replace the platform's dead
// env.REDIS_CLIENT caches (Redis was never part of the locked Workers/D1/KV/R2 stack).
// Every helper is null-safe: a missing namespace binding is a no-op, never an error.
// Note: KV expirationTtl has a 60-second floor — callers must pass ttl >= 60.

export async function kvGetJSON(ns, key) {
  if (!ns || !key) return null;
  try {
    const v = await ns.get(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export async function kvPutJSON(ns, key, value, ttlSeconds) {
  if (!ns || !key) return;
  try {
    await ns.put(key, JSON.stringify(value), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
  } catch { /* non-fatal */ }
}

export async function kvGetRaw(ns, key) {
  if (!ns || !key) return null;
  try {
    return await ns.get(key);
  } catch {
    return null;
  }
}

export async function kvPutRaw(ns, key, value, ttlSeconds) {
  if (!ns || !key) return;
  try {
    await ns.put(key, value, ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
  } catch { /* non-fatal */ }
}

export async function kvDel(ns, key) {
  if (!ns || !key) return;
  try {
    await ns.delete(key);
  } catch { /* non-fatal */ }
}
