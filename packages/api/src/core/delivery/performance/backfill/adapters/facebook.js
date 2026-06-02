/**
 * Facebook Historical Backfill Adapter
 * Lists page posts within the date window, embedding insights in each result.
 * account_id = Facebook Page ID (stored in social_connections)
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

export async function fetchFacebookHistorical({ accessToken, accountId, since, until, env }) {
  const proof = env?.META_CLIENT_SECRET
    ? await appSecretProof(accessToken, env.META_CLIENT_SECRET) : null;
  const proofParam = proof ? `&appsecret_proof=${proof}` : "";

  const sinceTs = Math.floor(since.getTime() / 1000);
  const untilTs = Math.floor(until.getTime() / 1000);

  const fields = [
    "id",
    "created_time",
    "insights.metric(post_impressions,post_engaged_users,post_clicks)",
    "shares",
    "likes.summary(true)",
    "comments.summary(true)",
  ].join(",");

  const posts = [];
  let nextUrl = `https://graph.facebook.com/v24.0/${accountId}/posts` +
    `?fields=${encodeURIComponent(fields)}` +
    `&since=${sinceTs}&until=${untilTs}&limit=50&access_token=${accessToken}${proofParam}`;

  for (let page = 0; page < 5 && nextUrl; page++) {
    const res = await fetch(nextUrl);
    if (!res.ok) {
      const errBody = await res.text().catch(() => res.status);
      if (page === 0) throw new Error(`Facebook API ${res.status}: ${errBody}`);
      break;
    }
    const body = await res.json();
    if (body.error) throw new Error(`Facebook API error ${body.error.code}: ${body.error.message}`);
    if (!Array.isArray(body.data)) break;
    posts.push(...body.data);
    nextUrl = body.paging?.next || null;
  }

  return posts.map(post => ({
    externalPostId: post.id,
    postedAt: post.created_time,
    // Live adapter expects the metrics embedded at top level — replicate that shape
    metrics: {
      insights: post.insights,
      shares: post.shares,
      likes: post.likes,
      comments: post.comments,
    },
  }));
}
