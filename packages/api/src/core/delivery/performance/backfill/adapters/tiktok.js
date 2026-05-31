/**
 * TikTok Historical Backfill Adapter
 * Lists user videos within the date window then fetches statistics for each.
 * Uses TikTok Content Posting API v2.
 */

export async function fetchTikTokHistorical({ accessToken, since, until }) {
  const sinceMs = since.getTime();
  const untilMs = until.getTime();

  const videoIds = [];
  const postedAtMap = {};
  let cursor = null;
  let hasMore = true;

  for (let page = 0; page < 5 && hasMore; page++) {
    const body = { max_count: 20 };
    if (cursor) body.cursor = cursor;

    const res = await fetch("https://open.tiktokapis.com/v2/video/list/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) break;
    const data = await res.json();
    const videos = data?.data?.videos || [];

    for (const v of videos) {
      const createMs = (v.create_time || 0) * 1000;
      if (createMs < sinceMs) { hasMore = false; break; }
      if (createMs <= untilMs) {
        videoIds.push(v.id);
        postedAtMap[v.id] = new Date(createMs).toISOString();
      }
    }

    cursor  = data?.data?.cursor   || null;
    hasMore = data?.data?.has_more  ?? false;
    if (!cursor) break;
  }

  if (!videoIds.length) return [];

  // Fetch statistics for all collected IDs in batches of 20
  const results = [];
  for (let i = 0; i < videoIds.length; i += 20) {
    const batch = videoIds.slice(i, i + 20);
    try {
      const qRes = await fetch("https://open.tiktokapis.com/v2/video/query/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filters: { video_ids: batch } }),
      });
      if (!qRes.ok) continue;
      const qBody = await qRes.json();
      for (const v of (qBody?.data?.videos || [])) {
        results.push({
          externalPostId: v.id,
          postedAt: postedAtMap[v.id] || new Date().toISOString(),
          metrics: { data: { videos: [v] } },
        });
      }
    } catch { /* non-fatal */ }
  }
  return results;
}
