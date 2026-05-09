import { error } from "./json.js";

const WINDOW_MS = 60_000; // 1 minute

const LIMITS = {
  auth: 20,
  content: 60,
  analytics: 30,
  admin: 120,
  billing: 10,
  support: 5, // 5 per 3s (sliding)
};

export async function rateLimit(request, env, bucket, customWindowMs = null, customUserId = null) {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    "unknown";

  const windowMs = customWindowMs || WINDOW_MS;
  const identifier = customUserId || ip;
  const key = `rl:${bucket}:${identifier}:${Math.floor(Date.now() / windowMs)}`;

  if (!env.RATE_LIMIT_KV) {
    return null;
  }

  const count = (await env.RATE_LIMIT_KV.get(key)) || 0;

  if (count >= (LIMITS[bucket] || 30)) {
    return error("Transmission frequency too high. Cooling down.", "TOO_MANY_REQUESTS", null, 429);
  }

  await env.RATE_LIMIT_KV.put(key, String(Number(count) + 1), {
    expirationTtl: Math.max(60, Math.ceil(windowMs / 1000) * 2), // TTL at least 60s for safety
  });

  return null;
}

