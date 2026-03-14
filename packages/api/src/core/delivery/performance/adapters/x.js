export async function fetchXMetrics({ accessToken, externalPostId }) {
  if (!externalPostId) {
    throw new Error("Missing externalPostId for X ingestion");
  }

  const response = await fetch(
    `https://api.twitter.com/2/tweets/${externalPostId}?tweet.fields=public_metrics`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`X API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}
