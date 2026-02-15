const WINDOW_MS = 60_000; // 1 minute

const LIMITS = {
  auth: 20,
  content: 60,
  analytics: 30,
  admin: 120,
  billing: 10,
};

export async function rateLimit(request, env, bucket) {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";

  const key = `rl:${bucket}:${ip}:${Math.floor(Date.now() / WINDOW_MS)}`;

  const count = (await env.RATE_LIMIT_KV.get(key)) || 0;

  if (count >= (LIMITS[bucket] || 30)) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
      }),
      { status: 429 }
    );
  }

  await env.RATE_LIMIT_KV.put(key, Number(count) + 1, {
    expirationTtl: WINDOW_MS / 1000,
  });
}
