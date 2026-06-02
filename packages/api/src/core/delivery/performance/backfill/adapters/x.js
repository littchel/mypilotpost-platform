/**
 * X (Twitter) Historical Backfill Adapter
 * Fetches up to 100 tweets per page from user timeline within the date window.
 * account_id = X numeric user ID (stored in social_connections)
 */

export async function fetchXHistorical({ accessToken, accountId, since, until }) {
  const startTime = since.toISOString();
  const endTime   = until.toISOString();

  const posts = [];
  let nextToken = null;

  for (let page = 0; page < 5; page++) {
    const url = new URL(`https://api.twitter.com/2/users/${accountId}/tweets`);
    url.searchParams.set("tweet.fields", "public_metrics,created_at");
    url.searchParams.set("start_time", startTime);
    url.searchParams.set("end_time",   endTime);
    url.searchParams.set("max_results", "100");
    if (nextToken) url.searchParams.set("pagination_token", nextToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => res.status);
      if (page === 0) throw new Error(`X API ${res.status}: ${errBody}`);
      break;
    }
    const body = await res.json();
    if (Array.isArray(body.data)) posts.push(...body.data);
    nextToken = body.meta?.next_token || null;
    if (!nextToken) break;
  }

  // Each tweet is already fully shaped — wrap in the live adapter's expected structure
  return posts.map(tweet => ({
    externalPostId: tweet.id,
    postedAt: tweet.created_at,
    metrics: { data: tweet },
  }));
}
