export async function fetchYouTubeMetrics({ accessToken, externalPostId }) {
  if (!externalPostId) {
    throw new Error("Missing externalPostId for YouTube ingestion");
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "statistics");
  url.searchParams.set("id", externalPostId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`YouTube API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}
