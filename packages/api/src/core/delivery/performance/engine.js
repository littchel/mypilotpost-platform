import { fetchLinkedInMetrics } from "./adapters/linkedin.js";
import { fetchFacebookMetrics } from "./adapters/facebook.js";
import { fetchXMetrics } from "./adapters/x.js";
import { fetchPinterestMetrics } from "./adapters/pinterest.js";
import { fetchYouTubeMetrics } from "./adapters/youtube.js";
import { fetchTikTokMetrics } from "./adapters/tiktok.js";
import { fetchGoogleAnalyticsMetrics } from "./adapters/google-analytics.js";

const ADAPTERS = {
  linkedin: fetchLinkedInMetrics,
  facebook: fetchFacebookMetrics,
  x: fetchXMetrics,
  pinterest: fetchPinterestMetrics,
  youtube: fetchYouTubeMetrics,
  tiktok: fetchTikTokMetrics,
  "google-analytics": fetchGoogleAnalyticsMetrics
};

export async function runPerformanceIngestion(env) {
  const delivered = await env.DB.prepare(`
    SELECT id, brand_id, content_id, platform, external_post_id
    FROM delivery_jobs
    WHERE status = 'DELIVERED'
      AND external_post_id IS NOT NULL
  `).all();

  if (!delivered.results.length) return;

  for (const row of delivered.results) {
    const adapter = ADAPTERS[row.platform];
    if (!adapter) continue;

    const account = await env.DB.prepare(`
      SELECT access_token, refresh_token
      FROM connected_accounts
      WHERE brand_id = ?
        AND platform = ?
      LIMIT 1
    `).bind(row.brand_id, row.platform).first();

    if (!account?.access_token) continue;

    try {
      const metrics = await adapter({
        accessToken: account.access_token,
        externalPostId: row.external_post_id
      });

      await env.DB.prepare(`
        INSERT INTO performance_snapshots (
          id,
          brand_id,
          content_id,
          platform,
          external_post_id,
          metrics_json,
          source,
          captured_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'api', CURRENT_TIMESTAMP)
      `).bind(
        crypto.randomUUID(),
        row.brand_id,
        row.content_id,
        row.platform,
        row.external_post_id,
        JSON.stringify(metrics)
      ).run();

    } catch (err) {
      console.error("Performance ingestion error:", row.platform, err);
      continue;
    }
  }
}
