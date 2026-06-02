/**
 * Google Analytics 4 Historical Backfill Adapter
 * selectedResourceId = "properties/XXXXXXXXX" (GA4 property ID)
 * Returns one row per day with aggregated site metrics.
 */

export async function fetchGoogleAnalyticsHistorical({ accessToken, selectedResourceId, since, until }) {
  if (!selectedResourceId) return [];

  const property = selectedResourceId.startsWith("properties/")
    ? selectedResourceId
    : `properties/${selectedResourceId}`;

  const startDate = since.toISOString().slice(0, 10);
  const endDate   = until.toISOString().slice(0, 10);

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${property}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagedSessions" },
          { name: "screenPageViews" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => String(res.status));
    throw new Error(`GA4 API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const rows = data.rows || [];

  return rows.map(row => {
    // GA4 date dimension format: "YYYYMMDD"
    const rawDate = row.dimensionValues?.[0]?.value || "";
    const date = rawDate.length === 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : rawDate;

    const vals = row.metricValues || [];
    return {
      externalPostId: `ga-${date}`,
      postedAt: `${date}T00:00:00Z`,
      metrics: {
        sessions:        parseInt(vals[0]?.value || "0", 10),
        totalUsers:      parseInt(vals[1]?.value || "0", 10),
        engagedSessions: parseInt(vals[2]?.value || "0", 10),
        pageViews:       parseInt(vals[3]?.value || "0", 10),
      },
    };
  });
}
