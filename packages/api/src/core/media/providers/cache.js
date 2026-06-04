/**
 * myPilotPost — Media Cache
 * Cloudflare KV with 30-minute TTL.
 * Degrades gracefully — no KV binding means no cache, not an error.
 * Add `MEDIA_CACHE_KV` to wrangler.toml to activate persistence.
 */

const TTL_SECONDS = 60 * 30; // 30 min

function cacheKey(query, platform) {
  const slug = `${platform}:${query}`.toLowerCase().replace(/[^a-z0-9:]/g, '_').slice(0, 64);
  return `media:v1:${slug}`;
}

export async function cacheGet(query, platform, env) {
  if (!env?.MEDIA_CACHE_KV) return null;
  try {
    const val = await env.MEDIA_CACHE_KV.get(cacheKey(query, platform));
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(query, platform, value, env) {
  if (!env?.MEDIA_CACHE_KV) return;
  try {
    await env.MEDIA_CACHE_KV.put(
      cacheKey(query, platform),
      JSON.stringify(value),
      { expirationTtl: TTL_SECONDS }
    );
  } catch { /* non-fatal */ }
}
