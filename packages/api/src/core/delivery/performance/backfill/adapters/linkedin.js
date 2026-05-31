/**
 * LinkedIn Historical Backfill Adapter
 * Lists UGC posts for the author URN and fetches socialActions metrics for each.
 * account_id = LinkedIn person URN or organization URN (e.g. urn:li:person:xxx)
 */

export async function fetchLinkedInHistorical({ accessToken, accountId, since, until }) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202401",
  };

  const authorUrn = accountId.startsWith("urn:") ? accountId : `urn:li:person:${accountId}`;
  const encodedAuthor = encodeURIComponent(`List(${encodeURIComponent(authorUrn)})`);

  const posts = [];
  let start = 0;
  const count = 50;

  for (let page = 0; page < 5; page++) {
    const res = await fetch(
      `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=${encodedAuthor}&count=${count}&start=${start}`,
      { headers }
    );
    if (!res.ok) break;
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
