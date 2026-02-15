import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

export async function recordMediaAttribution(
  request,
  env,
  auth
) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const {
    content_id,
    media_id,
    platform,
    placement,
    source,
    metrics
  } = body || {};

  if (!content_id || !media_id || !platform || !source) {
    return json({ error: "Missing required fields" }, 400);
  }

  const db = getDB(env);

  await db.prepare(`
    INSERT INTO media_attribution_events
    (brand_id, content_id, media_id, platform, placement, source,
     impressions, clicks, engagements, conversions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    auth.brand_id,
    content_id,
    media_id,
    platform,
    placement || null,
    source,
    metrics?.impressions || 0,
    metrics?.clicks || 0,
    metrics?.engagements || 0,
    metrics?.conversions || 0
  ).run();

  return json({ status: "recorded" });
}
