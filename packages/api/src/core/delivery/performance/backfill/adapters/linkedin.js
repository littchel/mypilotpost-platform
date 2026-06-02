/**
 * LinkedIn Historical Backfill Adapter
 * Uses the legacy v2 ugcPosts endpoint (unversioned).
 * The newer /rest/posts requires a LinkedIn-Version header with a specific active date
 * that may not match app permissions — v2/ugcPosts works without versioning.
 * account_id = LinkedIn member URN or numeric member ID
 */

export async function fetchLinkedInHistorical({ accessToken, accountId, since, until }) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
  };

  const authorUrn = accountId.startsWith("urn:li:") ? accountId : `urn:li:person:${accountId}`;

  const posts = [];
  let start = 0;
  const count = 50;

  for (let page = 0; page < 5; page++) {
    const url = new URL("https://api.linkedin.com/v2/ugcPosts");
    url.searchParams.set("q", "authors");
    url.searchParams.set("authors", `List(${encodeURIComponent(authorUrn)})`);
    url.searchParams.set("count", String(count));
    url.searchParams.set("start", String(start));

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const errBody = await res.text().catch(() => res.status);
      if (page === 0) throw new Error(`LinkedIn API ${res.status}: ${errBody}`);
      break;
    }
    const body = await res.json();
    const items = body.elements || [];
    if (!items.length) break;

    for (const item of items) {
      const createdMs = item.created?.time;
      if (!createdMs) continue;
      const postedAt = new Date(createdMs);
      if (postedAt < since || postedAt > until) continue;
      posts.push({ urn: item.id, postedAt: postedAt.toISOString() });
    }

    if (items.length < count) break;
    start += count;
  }

  const results = [];
  for (const post of posts) {
    try {
      const encodedUrn = encodeURIComponent(post.urn);
      const mRes = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodedUrn}`,
        { headers }
      );
      const metrics = mRes.ok ? await mRes.json() : {};
      results.push({ externalPostId: post.urn, postedAt: post.postedAt, metrics });
    } catch {
      results.push({ externalPostId: post.urn, postedAt: post.postedAt, metrics: {} });
    }
  }
  return results;
}
