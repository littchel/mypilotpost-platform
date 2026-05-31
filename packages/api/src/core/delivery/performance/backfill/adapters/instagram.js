/**
 * Instagram Historical Backfill Adapter
 * Lists media posted by the connected IG Business/Creator account within the date window,
 * fetches lifetime insights for each, and returns the standard backfill shape.
 *
 * Requires: account_id = Instagram Business Account ID (stored in social_connections)
 */

async function appSecretProof(accessToken, appSecret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(accessToken));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function fetchInstagramHistorical({ accessToken, accountId, since, until, env }) {
  const proof = env?.META_CLIENT_SECRET
    ? await appSecretProof(accessToken, env.META_CLIENT_SECRET) : null;
  const proofParam = proof ? `&appsecret_proof=${proof}` : "";

  const sinceTs = Math.floor(since.getTime() / 1000);
  const untilTs = Math.floor(until.getTime() / 1000);

  const posts = [];
  let nextUrl = `https://graph.facebook.com/v21.0/${accountId}/media` +
    `?fields=id,timestamp,like_count,comments_count` +
    `&since=${sinceTs}&until=${untilTs}&limit=50&access_token=${accessToken}${proofParam}`;

  // Paginate through all media in the date window (max 5 pages = 250 posts)
  for (let page = 0; page < 5 && nextUrl; page++) {
    const res = await fetch(nextUrl);
    if (!res.ok) break;
    const body = await res.json();
    if (!Array.isArray(body.data)) break;
    posts.push(...body.data);
    nextUrl = body.paging?.next || null;
  }

  const results = [];
  for (const post of posts) {
    let insights = { data: [] };
    try {
      const iRes = await fetch(
        `https://graph.facebook.com/v21.0/${post.id}/insights` +
        `?metric=impressions,reach,engagement,saved,shares&period=lifetime` +
        `&access_token=${accessToken}${proofParam}`
      );
      if (iRes.ok) insights = await iRes.json();
    } catch { /* non-fatal — personal accounts lack insights */ }

    results.push({
      externalPostId: post.id,
      postedAt: post.timestamp,
      metrics: { basic: post, insights },
    });
  }
  return results;
}
