/**
 * Threads Performance Adapter
 * Fetches lifetime metrics for a published Threads media object.
 * Threads API mirrors Meta's Graph API structure.
 */

export async function fetchThreadsMetrics({ accessToken, externalPostId }) {
  if (!externalPostId) throw new Error("Missing externalPostId for Threads ingestion");

  // Fetch basic fields
  const basicRes = await fetch(
    `https://graph.threads.net/v1.0/${externalPostId}?fields=id,like_count,replies_count,repost_count,quote_count,timestamp&access_token=${accessToken}`
  );

  if (!basicRes.ok) {
    const err = await basicRes.text();
    throw new Error(`Threads API error (${basicRes.status}): ${err}`);
  }

  const basic = await basicRes.json();

  // Fetch insights (views, likes, replies, reposts, quotes)
  let insights = { data: [] };
  try {
    const insightsRes = await fetch(
      `https://graph.threads.net/v1.0/${externalPostId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`
    );
    if (insightsRes.ok) insights = await insightsRes.json();
  } catch { /* non-fatal */ }

  return { basic, insights };
}
