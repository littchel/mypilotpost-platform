/**
 * Platform Operations Center — Admin Diagnostics
 * GET /api/v1/admin/integrations/diagnostics
 *
 * Returns a cross-brand capability matrix showing real connection health,
 * last publish, last metrics pull, and token status for every platform.
 */

import { json } from "../../lib/json.js";

// Static capability map — what each platform supports (code-level truth)
const PLATFORM_CAPABILITIES = {
  facebook:           { publishing: true,  analytics: true,  media: false, refresh: true,  webhooks: false },
  instagram:          { publishing: true,  analytics: true,  media: false, refresh: true,  webhooks: false },
  threads:            { publishing: true,  analytics: true,  media: false, refresh: false, webhooks: false },
  x:                  { publishing: true,  analytics: true,  media: false, refresh: true,  webhooks: false },
  linkedin:           { publishing: true,  analytics: true,  media: false, refresh: true,  webhooks: false },
  tiktok:             { publishing: true,  analytics: true,  media: false, refresh: true,  webhooks: false },
  pinterest:          { publishing: true,  analytics: true,  media: false, refresh: true,  webhooks: false },
  youtube:            { publishing: true,  analytics: true,  media: false, refresh: true,  webhooks: false },
  google_analytics:   { publishing: false, analytics: true,  media: false, refresh: true,  webhooks: false },
  google_search_console: { publishing: false, analytics: true, media: false, refresh: true, webhooks: false },
  google_drive:       { publishing: false, analytics: false, media: true,  refresh: true,  webhooks: false },
  canva:              { publishing: false, analytics: false, media: true,  refresh: false, webhooks: false },
  dropbox:            { publishing: false, analytics: false, media: true,  refresh: true,  webhooks: false },
  wordpress:          { publishing: true,  analytics: false, media: false, refresh: true,  webhooks: false },
};

function tokenHealth(conn) {
  if (conn.status === "expired" || conn.status === "revoked" || conn.status === "error") return "red";
  if (!conn.expires_at) return "green"; // No expiry = indefinite (e.g. page tokens)
  const daysLeft = (new Date(conn.expires_at) - Date.now()) / 86_400_000;
  if (daysLeft < 0)  return "red";
  if (daysLeft < 7)  return "yellow";
  return "green";
}

export async function getIntegrationsDiagnostics(env) {
  const db = env.DB || env.mypilotpost;

  // All brands
  const brandsRes = await db.prepare(
    "SELECT id, name FROM brands ORDER BY name ASC"
  ).all();
  const brands = brandsRes.results || [];

  // All active social connections
  const connsRes = await db.prepare(`
    SELECT id, brand_id, platform, account_id, platform_username,
           status, expires_at, last_refreshed_at, scopes, meta, updated_at
    FROM social_connections
    ORDER BY brand_id, platform
  `).all();
  const allConns = connsRes.results || [];

  // Last publish per (brand_id, platform)
  const publishRes = await db.prepare(`
    SELECT brand_id, platform,
           MAX(published_at) AS last_publish,
           COUNT(*) AS total_posts,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS delivered,
           SUM(CASE WHEN status = 'failed'    THEN 1 ELSE 0 END) AS failed
    FROM delivery_jobs
    WHERE published_at IS NOT NULL OR status IN ('completed','failed')
    GROUP BY brand_id, platform
  `).all();
  const publishMap = {};
  for (const r of (publishRes.results || [])) {
    publishMap[`${r.brand_id}:${r.platform}`] = r;
  }

  // Last metrics snapshot per (brand_id, platform)
  const snapRes = await db.prepare(`
    SELECT brand_id, platform, MAX(captured_at) AS last_metrics
    FROM performance_snapshots
    GROUP BY brand_id, platform
  `).all();
  const snapMap = {};
  for (const r of (snapRes.results || [])) {
    snapMap[`${r.brand_id}:${r.platform}`] = r.last_metrics;
  }

  // Aggregate connection counts for summary
  let totalConnections = allConns.length;
  let activeCount  = 0, expiredCount = 0, errorCount = 0;
  for (const c of allConns) {
    const h = tokenHealth(c);
    if (h === "green") activeCount++;
    else if (h === "red") {
      if (c.status === "expired" || (c.expires_at && new Date(c.expires_at) < new Date())) expiredCount++;
      else errorCount++;
    }
  }

  // Build per-brand data
  const connsByBrand = {};
  for (const c of allConns) {
    if (!connsByBrand[c.brand_id]) connsByBrand[c.brand_id] = [];
    connsByBrand[c.brand_id].push(c);
  }

  const brandData = brands.map(brand => {
    const conns = connsByBrand[brand.id] || [];
    const platforms = conns.map(conn => {
      const key = `${brand.id}:${conn.platform}`;
      const pub = publishMap[key] || {};
      const caps = PLATFORM_CAPABILITIES[conn.platform] || {};
      const health = tokenHealth(conn);

      // Overall platform status: red if token bad, yellow if no recent publish, green otherwise
      let overallStatus = health;
      if (overallStatus === "green" && pub.last_publish) {
        const daysSincePublish = (Date.now() - new Date(pub.last_publish)) / 86_400_000;
        if (daysSincePublish > 30) overallStatus = "yellow";
      }

      return {
        platform:          conn.platform,
        account_id:        conn.account_id,
        username:          conn.platform_username,
        status:            conn.status,
        token_health:      health,
        overall_status:    overallStatus,
        expires_at:        conn.expires_at || null,
        last_refreshed_at: conn.last_refreshed_at || null,
        last_publish:      pub.last_publish || null,
        last_metrics:      snapMap[key] || null,
        total_posts:       pub.total_posts || 0,
        delivered:         pub.delivered || 0,
        failed:            pub.failed || 0,
        scopes:            conn.scopes || null,
        capabilities:      {
          oauth:      true,
          publishing: caps.publishing  || false,
          analytics:  caps.analytics   || false,
          media:      caps.media       || false,
          refresh:    caps.refresh     || false,
          webhooks:   caps.webhooks    || false,
        },
      };
    });

    // Brand-level health: worst platform status wins
    const brandHealth = platforms.some(p => p.token_health === "red")   ? "red"
                      : platforms.some(p => p.token_health === "yellow") ? "yellow"
                      : platforms.length > 0 ? "green" : "none";

    return {
      brand_id:     brand.id,
      brand_name:   brand.name,
      brand_health: brandHealth,
      platform_count: platforms.length,
      platforms,
    };
  });

  // Latest backfill run
  const backfillRes = await db.prepare(`
    SELECT id, brand_id, platform, status, started_at, completed_at,
           rows_imported, rows_skipped, rows_failed, date_from, date_to
    FROM backfill_runs
    ORDER BY started_at DESC
    LIMIT 1
  `).first().catch(() => null);

  const runningRes = await db.prepare(`
    SELECT COUNT(*) AS n FROM backfill_runs WHERE status = 'running'
  `).first().catch(() => ({ n: 0 }));

  const totalImported = await db.prepare(`
    SELECT SUM(rows_imported) AS total FROM backfill_runs WHERE status = 'completed'
  `).first().catch(() => ({ total: 0 }));

  return json({
    generated_at: new Date().toISOString(),
    summary: {
      total_brands:      brands.length,
      total_connections: totalConnections,
      active:            activeCount,
      expiring_soon:     allConns.filter(c => tokenHealth(c) === "yellow").length,
      expired_or_error:  expiredCount + errorCount,
    },
    backfill: {
      last_run:        backfillRes || null,
      running_count:   runningRes?.n  || 0,
      total_imported:  totalImported?.total || 0,
    },
    brands: brandData,
  });
}
