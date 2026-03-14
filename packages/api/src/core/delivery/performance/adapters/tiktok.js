/**
 * TikTok Performance Adapter
 * Canon 5.5 — Raw Truth Only
 */

export async function fetchTikTokMetrics({ accessToken, externalPostId }) {
  if (!externalPostId) {
    throw new Error("Missing externalPostId");
  }

  const res = await fetch(
    "https://open.tiktokapis.com/v2/video/query/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filters: {
          video_ids: [externalPostId]
        }
      })
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TikTok API error: ${text}`);
  }

  return await res.json(); // RAW ONLY
}