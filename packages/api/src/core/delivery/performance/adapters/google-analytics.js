export async function fetchGoogleAnalyticsMetrics({ accessToken, externalPostId }) {
  if (!externalPostId) {
    throw new Error("Missing property ID for Google Analytics ingestion");
  }

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${externalPostId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "yesterday", endDate: "today" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagedSessions" }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Analytics API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}
