/**
 * Google Search Console Historical Backfill Adapter
 * selectedResourceId = site URL, e.g. "https://www.example.com/"
 * Returns one row per day with aggregated search performance metrics.
 */

export async function fetchGoogleSearchConsoleHistorical({ accessToken, selectedResourceId, since, until }) {
  if (!selectedResourceId) return [];

  const siteUrl    = encodeURIComponent(selectedResourceId);
  const startDate  = since.toISOString().slice(0, 10);
  const endDate    = until.toISOString().slice(0, 10);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["date"],
        rowLimit: 500,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => String(res.status));
    throw new Error(`GSC API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const rows = data.rows || [];

  return rows.map(row => {
    const date = row.keys?.[0] || "";
    return {
      externalPostId: `gsc-${date}`,
      postedAt: `${date}T00:00:00Z`,
      metrics: {
        clicks:      Math.round(row.clicks      || 0),
        impressions: Math.round(row.impressions || 0),
        ctr:         row.ctr        || 0,
        position:    row.position   || 0,
      },
    };
  });
}
