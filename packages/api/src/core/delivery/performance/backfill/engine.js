import { decrypt } from "../../../../lib/crypto.js";
import { normalizeMetrics } from "../normalizer.js";

import { fetchInstagramHistorical }           from "./adapters/instagram.js";
import { fetchThreadsHistorical }             from "./adapters/threads.js";
import { fetchFacebookHistorical }            from "./adapters/facebook.js";
import { fetchLinkedInHistorical }            from "./adapters/linkedin.js";
import { fetchXHistorical }                   from "./adapters/x.js";
import { fetchPinterestHistorical }           from "./adapters/pinterest.js";
import { fetchTikTokHistorical }              from "./adapters/tiktok.js";
import { fetchYouTubeHistorical }             from "./adapters/youtube.js";
import { fetchGoogleAnalyticsHistorical }     from "./adapters/google-analytics.js";
import { fetchGoogleSearchConsoleHistorical } from "./adapters/google-search-console.js";

const ADAPTERS = {
  instagram:              fetchInstagramHistorical,
  threads:                fetchThreadsHistorical,
  facebook:               fetchFacebookHistorical,
  linkedin:               fetchLinkedInHistorical,
  x:                      fetchXHistorical,
  pinterest:              fetchPinterestHistorical,
  tiktok:                 fetchTikTokHistorical,
  youtube:                fetchYouTubeHistorical,
  google_analytics:       fetchGoogleAnalyticsHistorical,
  google_search_console:  fetchGoogleSearchConsoleHistorical,
};

/**
 * Run historical analytics backfill.
 *
 * Options:
 *   brandId  — limit to one brand (omit = all brands)
 *   platform — limit to one platform (omit = all supported)
 *   daysBack — how many days of history to pull (default 90)
 */
export async function runBackfill(env, { brandId, platform, daysBack = 90 } = {}) {
  const db = env.DB || env.mypilotpost;
  const runId = crypto.randomUUID();
  const until = new Date();
  const since = new Date(until.getTime() - daysBack * 86_400_000);

  await db.prepare(`
    INSERT INTO backfill_runs (id, brand_id, platform, status, date_from, date_to)
    VALUES (?, ?, ?, 'running', ?, ?)
  `).bind(runId, brandId || null, platform || null,
          since.toISOString().slice(0, 10),
          until.toISOString().slice(0, 10)).run();

  let rowsImported = 0;
  let rowsSkipped  = 0;
  let rowsFailed   = 0;
  const errors = [];

  // Collect connections to process
  let query = `
    SELECT id, brand_id, platform, account_id, access_token, selected_resource_id
    FROM social_connections
    WHERE status = 'active'
  `;
  const binds = [];
  if (brandId)  { query += " AND brand_id = ?"; binds.push(brandId); }
  if (platform) { query += " AND platform = ?"; binds.push(platform); }

  const connsRes = await db.prepare(query).bind(...binds).all();
  const connections = connsRes.results || [];

  for (const conn of connections) {
    const adapter = ADAPTERS[conn.platform];
    if (!adapter) continue;

    let accessToken;
    try {
      accessToken = await decrypt(conn.access_token, env.ENCRYPTION_SECRET);
    } catch {
      errors.push({ platform: conn.platform, brand_id: conn.brand_id, message: "Token decrypt failed" });
      continue;
    }

    let posts = [];
    try {
      posts = await adapter({
        accessToken,
        accountId:          conn.account_id,
        selectedResourceId: conn.selected_resource_id,
        since,
        until,
        env,
      });
    } catch (err) {
      const msg = err.message || String(err);
      errors.push({ platform: conn.platform, brand_id: conn.brand_id, message: msg });
      rowsFailed++;
      continue;
    }

    for (const post of posts) {
      try {
        // Look up content_id from delivery_jobs if this post came through our platform
        const djRow = await db.prepare(`
          SELECT content_id, campaign_id FROM delivery_jobs
          WHERE external_post_id = ? AND brand_id = ? LIMIT 1
        `).bind(post.externalPostId, conn.brand_id).first();

        const contentId = djRow?.content_id ?? post.externalPostId;

        // Idempotent insert — unique index on (brand_id, external_post_id) WHERE source='backfill'
        const snapResult = await db.prepare(`
          INSERT OR IGNORE INTO performance_snapshots
            (id, brand_id, content_id, platform, external_post_id, metrics_json, source, captured_at, backfilled)
          VALUES (?, ?, ?, ?, ?, ?, 'backfill', ?, 1)
        `).bind(
          crypto.randomUUID(),
          conn.brand_id,
          contentId,
          conn.platform,
          post.externalPostId,
          JSON.stringify(post.metrics),
          post.postedAt,
        ).run();

        // Skip downstream writes if this record already existed
        if (!snapResult.meta?.changes) { rowsSkipped++; continue; }
        rowsImported++;

        // Normalize and write daily_analytics (accumulate)
        const normalized = normalizeMetrics(conn.platform, post.metrics);
        if (!normalized) continue;
        const day = post.postedAt.slice(0, 10);

        await db.prepare(`
          INSERT INTO daily_analytics (id, brand_id, date, impressions, engagements, clicks)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(brand_id, date) DO UPDATE SET
            impressions = impressions + excluded.impressions,
            engagements = engagements + excluded.engagements,
            clicks      = clicks      + excluded.clicks
        `).bind(
          crypto.randomUUID(),
          conn.brand_id,
          day,
          normalized.impressions,
          normalized.engagements,
          normalized.clicks,
        ).run();

        // Write content_analytics for every backfilled post.
        // contentId is the delivery_job's content_id when we have one, else the platform post ID.
        await db.prepare(`
          INSERT INTO content_analytics
            (id, brand_id, content_type, content_id, platform,
             impressions, engagements, clicks, comments, shares, saves,
             reported_at, updated_at)
          VALUES (?, ?, 'social', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(content_type, content_id) DO UPDATE SET
            impressions = excluded.impressions,
            engagements = excluded.engagements,
            clicks      = excluded.clicks,
            comments    = excluded.comments,
            shares      = excluded.shares,
            saves       = excluded.saves,
            reported_at = excluded.reported_at,
            updated_at  = CURRENT_TIMESTAMP
        `).bind(
          crypto.randomUUID(), conn.brand_id, contentId, conn.platform,
          normalized.impressions, normalized.engagements, normalized.clicks,
          normalized.comments, normalized.shares, normalized.saves,
          day,
        ).run();

      } catch (postErr) {
        rowsFailed++;
        errors.push({
          platform: conn.platform,
          brand_id: conn.brand_id,
          message: `Post ${post.externalPostId}: ${postErr.message || postErr}`,
        });
      }
    }
  }

  await db.prepare(`
    UPDATE backfill_runs SET
      status       = ?,
      completed_at = CURRENT_TIMESTAMP,
      rows_imported = ?,
      rows_skipped  = ?,
      rows_failed   = ?,
      error_log     = ?
    WHERE id = ?
  `).bind(
    rowsFailed > 0 && rowsImported === 0 ? "failed" : "completed",
    rowsImported, rowsSkipped, rowsFailed,
    errors.length ? JSON.stringify(errors) : null,
    runId,
  ).run();

  return { runId, rowsImported, rowsSkipped, rowsFailed, errors };
}

/**
 * Fetch recent backfill run summaries for the admin UI.
 */
export async function getBackfillStatus(env, { brandId, limit = 20 } = {}) {
  const db = env.DB || env.mypilotpost;
  let query = `
    SELECT id, brand_id, platform, status, started_at, completed_at,
           rows_imported, rows_skipped, rows_failed, date_from, date_to
    FROM backfill_runs
  `;
  const binds = [];
  if (brandId) { query += " WHERE brand_id = ?"; binds.push(brandId); }
  query += " ORDER BY started_at DESC LIMIT ?";
  binds.push(limit);

  const res = await db.prepare(query).bind(...binds).all();
  return res.results || [];
}
