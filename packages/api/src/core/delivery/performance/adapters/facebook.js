export async function fetchFacebookMetrics({ accessToken, externalPostId }) {
  if (!externalPostId) {
    throw new Error("Missing externalPostId for Facebook ingestion");
  }

  const url = new URL(`https://graph.facebook.com/v24.0/${externalPostId}`);
  url.searchParams.set(
    "fields",
    "insights.metric(post_impressions,post_engaged_users,post_clicks),shares,likes.summary(true),comments.summary(true)"
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), { method: "GET" });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Facebook API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}
