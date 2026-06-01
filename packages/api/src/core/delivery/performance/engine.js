import { decrypt } from "../../../lib/crypto.js";
import { normalizeMetrics } from "./normalizer.js";
import { fetchLinkedInMetrics } from "./adapters/linkedin.js";
import { fetchFacebookMetrics } from "./adapters/facebook.js";
import { fetchInstagramMetrics } from "./adapters/instagram.js";
import { fetchThreadsMetrics } from "./adapters/threads.js";
import { fetchXMetrics } from "./adapters/x.js";
import { fetchPinterestMetrics } from "./adapters/pinterest.js";
import { fetchYouTubeMetrics } from "./adapters/youtube.js";
import { fetchTikTokMetrics } from "./adapters/tiktok.js";
import { fetchGoogleAnalyticsMetrics } from "./adapters/google-analytics.js";

const ADAPTERS = {
  linkedin:           fetchLinkedInMetrics,
  facebook:           fetchFacebookMetrics,
  instagram:          fetchInstagramMetrics,
  threads:            fetchThreadsMetrics,
  x:                  fetchXMetrics,
  pinterest:          fetchPinterestMetrics,
  youtube:            fetchYouTubeMetrics,
  tiktok:             fetchTikTokMetrics,
  "google-analytics": fetchGoogleAnalyticsMetrics,
};

export async function runPerformanceIngestion(env) {
  const delivered = await env.DB.prepare(`
    SELECT id, brand_id, content_id, platform, external_post_id
    FROM delivery_jobs
    WHERE status = 'published'
      AND external_post_id IS NOT NULL
  `).all();

  if (!delivered.results.length) return;

  for (const row of delivered.results) {
    const adapter = ADAPTERS[row.platform];
    if (!adapter) continue;

    const account = await env.DB.prepare(`
      SELECT access_token, refresh_token
      FROM social_connections
      WHERE brand_id = ?
        AND platform = ?
        AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
    `).bind(row.brand_id, row.platform).first();

    if (!account?.access_token) continue;

    let accessToken;
    try {
      accessToken = await decrypt(account.access_token, env.ENCRYPTION_SECRET);
    } catch { continue; }

    try {
      const metrics = await adapter({
        accessToken,
        externalPostId: row.external_post_id,
        env,
      });

      const metricsStr = JSON.stringify(metrics);

      // Store raw snapshot
      await env.DB.prepare(`
        INSERT INTO performance_snapshots (
          id, brand_id, content_id, platform, external_post_id,
          metrics_json, source, captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'api', CURRENT_TIMESTAMP)
      `).bind(
        crypto.randomUUID(),
        row.brand_id,
        row.content_id,
        row.platform,
        row.external_post_id,
        metricsStr
      ).run();

      // Normalize and upsert into content_analytics
      const normalized = normalizeMetrics(row.platform, metrics);
      if (normalized) {
        const today = new Date().toISOString().slice(0, 10);

        await env.DB.prepare(`
          INSERT INTO content_analytics (
            id, brand_id, content_type, content_id, platform,
            impressions, engagements, clicks, comments, shares, saves,
            reported_at, updated_at
          ) VALUES (?, ?, 'social', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(content_type, content_id) DO UPDATE SET
            platform    = excluded.platform,
            impressions = excluded.impressions,
            engagements = excluded.engagements,
            clicks      = excluded.clicks,
            comments    = excluded.comments,
            shares      = excluded.shares,
            saves       = excluded.saves,
            reported_at = excluded.reported_at,
            updated_at  = CURRENT_TIMESTAMP
        `).bind(
          crypto.randomUUID(),
          row.brand_id,
          row.content_id,
          row.platform,
          normalized.impressions,
          normalized.engagements,
          normalized.clicks,
          normalized.comments,
          normalized.shares,
          normalized.saves,
          today
        ).run();

        // Daily rollup — accumulate normalized metrics per day
        await env.DB.prepare(`
          INSERT INTO daily_analytics (id, brand_id, date, impressions, engagements, clicks)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(brand_id, date) DO UPDATE SET
            impressions = impressions + excluded.impressions,
            engagements = engagements + excluded.engagements,
            clicks      = clicks + excluded.clicks
        `).bind(
          crypto.randomUUID(),
          row.brand_id,
          today,
          normalized.impressions,
          normalized.engagements,
          normalized.clicks
        ).run();
      }

    } catch (err) {
      console.error(`[PERF_INGESTION] ${row.platform} error:`, err.message || err);
      continue;
    }
  }
}
