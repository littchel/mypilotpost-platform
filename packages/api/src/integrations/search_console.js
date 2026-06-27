/**
 * Google Search Console Integration
 * Reads data via the Search Console API using the stored OAuth token.
 * All writes go to search_console_properties, search_console_queries, search_console_pages.
 * Aggregate daily metrics are also written to seo_metrics for the SEO overview.
 */

import { getDB } from "../lib/db.js";
import { decrypt, encrypt } from "../lib/crypto.js";
import { json, error } from "../lib/json.js";
import { getProvider } from "./registry.js";

const GSC_BASE = "https://www.googleapis.com/webmasters/v3";

/**
 * Fetch from the Search Console API using the decrypted access token.
 * Returns { ok, status, data }.
 */
async function gscFetch(path, accessToken, { method = "GET", body } = {}) {
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Accept": "application/json"
  };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${GSC_BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { ok: res.ok, status: res.status, data };
}

/**
 * Retrieve the active Google Search Console token for a brand.
 * Returns the decrypted access token and connection record, or null if not connected.
 */
async function getGSCToken(db, env, brand_id) {
  const conn = await db.prepare(`
    SELECT id, access_token, refresh_token, expires_at, status
    FROM social_connections
    WHERE brand_id = ? AND platform = 'google_search_console' AND status = 'active'
    LIMIT 1
  `).bind(brand_id).first();

  if (!conn) return null;

  try {
    const accessToken = await decrypt(conn.access_token, env.ENCRYPTION_SECRET);
    return { ...conn, accessToken };
  } catch (err) {
    console.error("[GSC_TOKEN_DECRYPT_FAILED]", err.message);
    return null;
  }
}

/**
 * Try to refresh the GSC token if it has expired.
 * Returns the new decrypted access token or null.
 */
async function refreshGSCToken(db, env, conn) {
  if (!conn.refresh_token) return null;

  try {
    const refreshToken = await decrypt(conn.refresh_token, env.ENCRYPTION_SECRET);
    const provider = getProvider("google_search_console");
    const client_id = env.GOOGLE_CLIENT_ID;
    const client_secret = env.GOOGLE_CLIENT_SECRET;

    if (!client_id || !client_secret) {
      console.error("[GSC_REFRESH_NO_CREDS] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing");
      return null;
    }

    const res = await fetch(provider.endpoints.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id,
        client_secret
      })
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      console.error("[GSC_REFRESH_FAILED]", data.error, data.error_description);
      if (data.error === "invalid_grant") {
        await db.prepare("UPDATE social_connections SET status = 'revoked', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(conn.id).run();
      }
      return null;
    }

    const access_enc = await encrypt(data.access_token, env.ENCRYPTION_SECRET);
    const expires_at = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    await db.prepare(`
      UPDATE social_connections SET
        access_token = ?, expires_at = ?, status = 'active',
        last_refreshed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(access_enc, expires_at, conn.id).run();

    return data.access_token;
  } catch (err) {
    console.error("[GSC_REFRESH_ERROR]", err.message);
    return null;
  }
}

/**
 * Get a valid access token — refreshing if needed.
 */
async function getValidGSCToken(db, env, brand_id) {
  const conn = await getGSCToken(db, env, brand_id);
  if (!conn) return { token: null, error: "not_connected" };

  // Check if token is expired (with 5-minute buffer)
  const isExpired = conn.expires_at && new Date(conn.expires_at).getTime() < Date.now() + 5 * 60 * 1000;
  if (isExpired) {
    const refreshed = await refreshGSCToken(db, env, conn);
    if (!refreshed) return { token: null, error: "token_expired" };
    return { token: refreshed };
  }

  return { token: conn.accessToken };
}

/**
 * POST /api/customer/analytics/search-console/sync
 * Syncs Search Console data for the last 28 days into local tables.
 */
export async function syncSearchConsoleData(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const { token, error: tokenErr } = await getValidGSCToken(db, env, auth.brand_id);

  if (!token) {
    if (tokenErr === "not_connected") {
      return json({ success: false, reason: "not_connected", message: "Google Search Console is not connected. Connect it from Integrations." }, 200);
    }
    return json({ success: false, reason: "token_expired", message: "Google Search Console token has expired. Please reconnect." }, 200);
  }

  // 1. List sites
  const sitesRes = await gscFetch("/sites", token);
  if (!sitesRes.ok) {
    if (sitesRes.status === 401) {
      await db.prepare("UPDATE social_connections SET status = 'revoked', updated_at = CURRENT_TIMESTAMP WHERE brand_id = ? AND platform = 'google_search_console'")
        .bind(auth.brand_id).run();
      return json({ success: false, reason: "token_revoked", message: "Search Console access was revoked. Please reconnect." }, 200);
    }
    console.error("[GSC_SITES_FAILED]", sitesRes.status, sitesRes.data);
    return json({ success: false, reason: "api_error", message: "Failed to fetch Search Console sites." }, 200);
  }

  const sites = (sitesRes.data?.siteEntry || []).filter(
    s => s.permissionLevel !== "siteUnverifiedUser"
  );

  if (sites.length === 0) {
    return json({ success: true, properties_found: 0, message: "No verified properties found in Search Console." }, 200);
  }

  // Get the selected resource from social_connections first
  const connRow = await db.prepare(`
    SELECT selected_resource_id FROM social_connections
    WHERE brand_id = ? AND platform = 'google_search_console' AND status = 'active'
    LIMIT 1
  `).bind(auth.brand_id).first();

  const selectedSite = connRow?.selected_resource_id;

  // 2. Upsert properties
  for (const site of sites) {
    const id = crypto.randomUUID();
    const isDefault = selectedSite ? (selectedSite === site.siteUrl ? 1 : 0) : 0;
    await db.prepare(`
      INSERT INTO search_console_properties (id, brand_id, property_url, permission_level, is_default, synced_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(brand_id, property_url) DO UPDATE SET
        permission_level = excluded.permission_level,
        is_default = excluded.is_default,
        synced_at = CURRENT_TIMESTAMP
    `).bind(id, auth.brand_id, site.siteUrl, site.permissionLevel, isDefault).run();
  }

  // Use selectedSite (or first site / previously marked default) as primary
  const { results: props } = await db.prepare(`
    SELECT property_url FROM search_console_properties
    WHERE brand_id = ?
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1
  `).bind(auth.brand_id).all();

  const primaryProperty = selectedSite || props?.[0]?.property_url || sites[0].siteUrl;

  // Date range: last 28 days
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // 3. Query analytics — by date (for seo_metrics aggregate)
  const dateRes = await gscFetch(`/sites/${encodeURIComponent(primaryProperty)}/searchAnalytics/query`, token, {
    method: "POST",
    body: { startDate, endDate, dimensions: ["date"], rowLimit: 28 }
  });

  if (dateRes.ok && Array.isArray(dateRes.data?.rows)) {
    for (const row of dateRes.data.rows) {
      const date = row.keys[0];
      const metricId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO seo_metrics (id, brand_id, date, impressions, clicks, ctr, avg_position, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'search_console')
        ON CONFLICT(brand_id, date) DO UPDATE SET
          impressions = excluded.impressions,
          clicks = excluded.clicks,
          ctr = excluded.ctr,
          avg_position = excluded.avg_position,
          source = 'search_console'
      `).bind(
        metricId, auth.brand_id, date,
        row.impressions || 0, row.clicks || 0,
        Number((row.ctr || 0).toFixed(4)),
        Number((row.position || 0).toFixed(2))
      ).run();
    }
  }

  // 4. Top queries
  const queriesRes = await gscFetch(`/sites/${encodeURIComponent(primaryProperty)}/searchAnalytics/query`, token, {
    method: "POST",
    body: { startDate, endDate, dimensions: ["query"], rowLimit: 25, orderBy: [{ fieldName: "clicks", sortOrder: "descending" }] }
  });

  if (queriesRes.ok && Array.isArray(queriesRes.data?.rows)) {
    // Clear old query data for this brand before reinserting
    await db.prepare("DELETE FROM search_console_queries WHERE brand_id = ?").bind(auth.brand_id).run();
    for (const row of queriesRes.data.rows) {
      const id = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO search_console_queries (id, brand_id, property_url, query, clicks, impressions, ctr, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, auth.brand_id, primaryProperty, row.keys[0],
        row.clicks || 0, row.impressions || 0,
        Number((row.ctr || 0).toFixed(4)),
        Number((row.position || 0).toFixed(2))
      ).run();
    }
  }

  // 5. Top pages
  const pagesRes = await gscFetch(`/sites/${encodeURIComponent(primaryProperty)}/searchAnalytics/query`, token, {
    method: "POST",
    body: { startDate, endDate, dimensions: ["page"], rowLimit: 25, orderBy: [{ fieldName: "clicks", sortOrder: "descending" }] }
  });

  if (pagesRes.ok && Array.isArray(pagesRes.data?.rows)) {
    await db.prepare("DELETE FROM search_console_pages WHERE brand_id = ?").bind(auth.brand_id).run();
    for (const row of pagesRes.data.rows) {
      const id = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO search_console_pages (id, brand_id, property_url, page, clicks, impressions, ctr, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, auth.brand_id, primaryProperty, row.keys[0],
        row.clicks || 0, row.impressions || 0,
        Number((row.ctr || 0).toFixed(4)),
        Number((row.position || 0).toFixed(2))
      ).run();
    }
  }

  return json({
    success: true,
    properties_found: sites.length,
    primary_property: primaryProperty,
    date_range: { startDate, endDate }
  });
}

/**
 * GET /api/customer/analytics/search-console/properties
 * Returns verified Search Console properties for the brand.
 */
export async function getSearchConsoleProperties(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const connected = await db.prepare(`
    SELECT id FROM social_connections WHERE brand_id = ? AND platform = 'google_search_console' AND status = 'active'
  `).bind(auth.brand_id).first();

  if (!connected) {
    return json({ connected: false, properties: [] });
  }

  const { results: properties } = await db.prepare(`
    SELECT property_url, permission_level, is_default, synced_at
    FROM search_console_properties WHERE brand_id = ?
    ORDER BY is_default DESC, created_at ASC
  `).bind(auth.brand_id).all();

  return json({ connected: true, properties: properties || [] });
}

/**
 * GET /api/customer/analytics/search-console/overview
 * Returns aggregate SEO metrics from Search Console data.
 */
export async function getSearchConsoleOverview(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const connected = await db.prepare(`
    SELECT id FROM social_connections WHERE brand_id = ? AND platform = 'google_search_console' AND status = 'active'
  `).bind(auth.brand_id).first();

  if (!connected) {
    return json({
      connected: false,
      message: "Connect Google Search Console from Integrations to see search performance data.",
      summary: null,
      top_queries: [],
      top_pages: [],
      trends: []
    });
  }

  const summary = await db.prepare(`
    SELECT
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      AVG(ctr) as avg_ctr,
      AVG(avg_position) as avg_position
    FROM seo_metrics
    WHERE brand_id = ? AND source = 'search_console'
  `).bind(auth.brand_id).first();

  const { results: topQueries } = await db.prepare(`
    SELECT query, clicks, impressions, ctr, position
    FROM search_console_queries
    WHERE brand_id = ?
    ORDER BY clicks DESC
    LIMIT 10
  `).bind(auth.brand_id).all();

  const { results: topPages } = await db.prepare(`
    SELECT page, clicks, impressions, ctr, position
    FROM search_console_pages
    WHERE brand_id = ?
    ORDER BY clicks DESC
    LIMIT 10
  `).bind(auth.brand_id).all();

  const { results: trends } = await db.prepare(`
    SELECT date, impressions, clicks, ctr, avg_position as position
    FROM seo_metrics
    WHERE brand_id = ? AND source = 'search_console'
    ORDER BY date ASC
    LIMIT 30
  `).bind(auth.brand_id).all();

  const hasData = (summary?.total_clicks || 0) > 0 || (summary?.total_impressions || 0) > 0;

  return json({
    connected: true,
    has_data: hasData,
    summary: hasData ? {
      impressions: summary?.total_impressions || 0,
      clicks: summary?.total_clicks || 0,
      ctr: Number((summary?.avg_ctr || 0) * 100).toFixed(2) + "%",
      position: Number(summary?.avg_position || 0).toFixed(1)
    } : null,
    top_queries: topQueries || [],
    top_pages: topPages || [],
    trends: trends || [],
    message: hasData ? null : "No data yet. Click Sync to fetch your latest Search Console data."
  });
}
