import { nanoid } from 'nanoid';

export async function ingestPerformance(db, payload) {
  const {
    brand_id,
    content_type,
    content_id,
    platform = null,
    impressions = 0,
    likes = 0,
    comments = 0,
    shares = 0,
    clicks = 0,
    watch_time = 0,
    snapshot_date
  } = payload;

  if (!brand_id || !content_type || !content_id || !snapshot_date) {
    throw new Error("Missing required performance fields");
  }

  const engagement_rate =
    impressions > 0
      ? (likes + comments + shares) / impressions
      : 0;

  await db.prepare(`
    INSERT INTO content_performance_metrics (
      id,
      brand_id,
      content_type,
      content_id,
      platform,
      impressions,
      likes,
      comments,
      shares,
      clicks,
      watch_time,
      engagement_rate,
      snapshot_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    nanoid(),
    brand_id,
    content_type,
    content_id,
    platform,
    impressions,
    likes,
    comments,
    shares,
    clicks,
    watch_time,
    engagement_rate,
    snapshot_date
  ).run();
}
