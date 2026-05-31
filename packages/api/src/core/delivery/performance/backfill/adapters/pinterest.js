/**
 * Pinterest Historical Backfill Adapter
 * Lists pins and fetches per-pin analytics for the date window.
 * The list-pins endpoint does not support date filtering — we filter client-side.
 */

export async function fetchPinterestHistorical({ accessToken, since, until }) {
  const pins = [];
  let bookmark = null;

  for (let page = 0; page < 5; page++) {
    const url = new URL("https://api.pinterest.com/v5/pins");
    url.searchParams.set("page_size", "50");
    if (bookmark) url.searchParams.set("bookmark", bookmark);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const body = await res.json();
    if (!Array.isArray(body.items)) break;

    for (const pin of body.items) {
      if (!pin.created_at) continue;
      const createdAt = new Date(pin.created_at);
      if (createdAt < since) break; // Pins are returned newest-first — stop early
      if (createdAt <= until) pins.push(pin);
    }

    bookmark = body.bookmark || null;
    if (!bookmark) break;
  }

  const startDate = since.toISOString().slice(0, 10);
  const endDate   = until.toISOString().slice(0, 10);

  const results = [];
  for (const pin of pins) {
    let metrics = { metrics: {} };
    try {
      const mRes = await fetch(
        `https://api.pinterest.com/v5/pins/${pin.id}/analytics` +
        `?start_date=${startDate}&end_date=${endDate}&metric_types=IMPRESSION,ENGAGEMENT,OUTBOUND_CLICK,SAVE`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (mRes.ok) {
        const mBody = await mRes.json();
        // Flatten daily metric totals into a single object
        const agg = { impression: 0, engagement: 0, outbound_click: 0, save: 0 };
        for (const daily of (mBody.all?.daily_metrics || [])) {
          agg.impression      += daily.metrics?.IMPRESSION       || 0;
          agg.engagement      += daily.metrics?.ENGAGEMENT       || 0;
          agg.outbound_click  += daily.metrics?.OUTBOUND_CLICK   || 0;
          agg.save            += daily.metrics?.SAVE             || 0;
        }
        metrics = { metrics: agg };
      }
    } catch { /* non-fatal */ }

    results.push({ externalPostId: pin.id, postedAt: pin.created_at, metrics });
  }
  return results;
}
