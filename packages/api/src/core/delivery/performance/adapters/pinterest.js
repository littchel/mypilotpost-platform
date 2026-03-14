export async function fetchPinterestMetrics({ accessToken, externalPostId }) {
  if (!externalPostId) {
    throw new Error("Missing externalPostId for Pinterest ingestion");
  }

  const response = await fetch(
    `https://api.pinterest.com/v5/pins/${externalPostId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Pinterest API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}
