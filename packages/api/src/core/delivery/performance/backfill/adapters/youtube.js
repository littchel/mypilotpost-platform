/**
 * YouTube Historical Backfill Adapter
 * Walks the channel's uploads playlist within the date window, then fetches
 * per-video statistics. account_id = YouTube Channel ID.
 */

export async function fetchYouTubeHistorical({ accessToken, accountId, since, until }) {
  // Step 1: Get uploads playlist ID from channel
  const chRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels` +
    `?part=contentDetails&id=${accountId}&access_token=${accessToken}`
  );
  if (!chRes.ok) return [];
  const chBody = await chRes.json();
  const uploadsPlaylistId = chBody.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  // Step 2: List playlist items (videos)
  const videoIds = [];
  const publishedAtMap = {};
  let pageToken = null;

  for (let page = 0; page < 5; page++) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", uploadsPlaylistId);
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url.toString());
    if (!res.ok) break;
    const body = await res.json();

    for (const item of (body.items || [])) {
      const publishedAt = new Date(item.snippet?.publishedAt || 0);
      if (publishedAt < since) { pageToken = null; break; } // oldest-first — stop
      if (publishedAt <= until) {
        const videoId = item.snippet?.resourceId?.videoId;
        if (videoId) {
          videoIds.push(videoId);
          publishedAtMap[videoId] = item.snippet.publishedAt;
        }
      }
    }

    pageToken = body.nextPageToken || null;
    if (!pageToken) break;
  }

  if (!videoIds.length) return [];

  // Step 3: Fetch statistics in batches of 50
  const results = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    try {
      const vRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos` +
        `?part=statistics&id=${batch.join(",")}&access_token=${accessToken}`
      );
      if (!vRes.ok) continue;
      const vBody = await vRes.json();
      for (const item of (vBody.items || [])) {
        results.push({
          externalPostId: item.id,
          postedAt: publishedAtMap[item.id] || new Date().toISOString(),
          metrics: { items: [item] },
        });
      }
    } catch { /* non-fatal */ }
  }
  return results;
}
