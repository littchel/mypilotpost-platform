/**
 * Threads Historical Backfill Adapter
 * Lists threads posted by the connected account within the date window.
 * account_id = Threads User ID (stored in social_connections)
 */

export async function fetchThreadsHistorical({ accessToken, accountId, since, until }) {
  const sinceTs = Math.floor(since.getTime() / 1000);
  const untilTs = Math.floor(until.getTime() / 1000);

  const posts = [];
  let nextUrl = `https://graph.threads.net/v1.0/${accountId}/threads` +
    `?fields=id,timestamp,like_count,replies_count,repost_count,quote_count` +
    `&since=${sinceTs}&until=${untilTs}&limit=50&access_token=${accessToken}`;

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
        `https://graph.threads.net/v1.0/${post.id}/insights` +
        `?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`
      );
      if (iRes.ok) insights = await iRes.json();
    } catch { /* non-fatal */ }

    results.push({
      externalPostId: post.id,
      postedAt: post.timestamp,
      metrics: { basic: post, insights },
    });
  }
  return results;
}
