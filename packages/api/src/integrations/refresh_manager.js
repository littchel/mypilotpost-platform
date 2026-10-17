/**
 * Unified Social Token Refresh Manager
 * Handles scheduled background refreshes and preemptive on-demand refreshing.
 */

import { getDB } from "../lib/db.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { getProvider } from "./registry.js";
import { writeSystemEvent } from "../api/admin/observability.js";

/**
 * Refresh a single social connection
 */
export async function refreshSocialConnection(db, connection, env) {
  const provider = getProvider(connection.platform);
  const secret = env.ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error("ENCRYPTION_SECRET not set in Worker environment");
  }

  // Threads uses long-lived access tokens (60 days) refreshed via th_refresh_token grant
  if (connection.platform === 'threads') {
    if (!connection.access_token) {
      console.warn(`[REFRESH_SKIP] threads:${connection.id} — no access_token, skipping`);
      return { success: false, status: 'no_access_token' };
    }

    try {
      // Atomic concurrency lease: Ensure only one worker refreshes within 30 seconds
      const lease = await db.prepare(`
        UPDATE social_connections
        SET last_refreshed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND (last_refreshed_at IS NULL OR last_refreshed_at < DATETIME('now', '-30 seconds'))
      `).bind(connection.id).run();

      if (lease && lease.meta && lease.meta.changes === 0) {
        console.log(`[REFRESH_CONCURRENCY] Connection ${connection.id} refreshed recently. Skipping parallel refresh.`);
        return { success: true, status: 'already_refreshed' };
      }

      const accessToken = await decrypt(connection.access_token, secret);
      const threadsUrl = new URL("https://graph.threads.net/refresh_access_token");
      threadsUrl.searchParams.set("grant_type", "th_refresh_token");
      threadsUrl.searchParams.set("access_token", accessToken);

      const res = await fetch(threadsUrl.toString(), { method: "GET" });
      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        if (res.status === 429) {
          console.warn(`[REFRESH_RATE_LIMITED] threads:${connection.id} — status 429`);
          return { success: false, status: 'rate_limited' };
        }
        if (res.status >= 500) {
          console.warn(`[REFRESH_PROVIDER_OUTAGE] threads:${connection.id} — status ${res.status}`);
          return { success: false, status: 'transient_outage' };
        }
        const isRevoked = res.status === 400 || res.status === 401;
        const status = isRevoked ? 'revoked' : 'error';
        await db.prepare("UPDATE social_connections SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(status, connection.id).run();
        writeSystemEvent(env, {
          severity: status === 'revoked' ? 'critical' : 'warning',
          source: 'oauth',
          message: `Token ${status} for threads (connection ${connection.id})`,
          metadata: JSON.stringify({ platform: 'threads', connection_id: connection.id, error: data.error })
        }).catch(() => {});
        return { success: false, status };
      }

      if (!data.access_token || typeof data.access_token !== 'string') {
        throw new Error("Threads refresh response missing valid access_token");
      }

      const access_enc = await encrypt(data.access_token, secret);
      const expires_at = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : new Date(Date.now() + 60 * 86400 * 1000).toISOString();

      await db.prepare(`
        UPDATE social_connections SET
          access_token = ?,
          expires_at = ?,
          status = 'active',
          last_refreshed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(access_enc, expires_at, connection.id).run();

      return { success: true };
    } catch (err) {
      console.error(`[REFRESH_EXCEPTION] threads:${connection.id}`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Connections without a refresh_token (e.g. Meta Facebook/Instagram Page tokens)
  // cannot be refreshed via standard refresh_token grant. Return early — do NOT set status='error'.
  if (!connection.refresh_token) {
    console.warn(`[REFRESH_SKIP] ${connection.platform}:${connection.id} — no refresh_token, skipping`);
    return { success: false, status: 'no_refresh_token' };
  }

  try {
    // Atomic concurrency lease: Ensure only one worker refreshes within 30 seconds
    const lease = await db.prepare(`
      UPDATE social_connections
      SET last_refreshed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND (last_refreshed_at IS NULL OR last_refreshed_at < DATETIME('now', '-30 seconds'))
    `).bind(connection.id).run();

    if (lease && lease.meta && lease.meta.changes === 0) {
      console.log(`[REFRESH_CONCURRENCY] Connection ${connection.id} refreshed recently or currently refreshing. Skipping parallel refresh.`);
      return { success: true, status: 'already_refreshed' };
    }

    const refreshToken = await decrypt(connection.refresh_token, secret);

    const credKey = (provider?.credential_key || connection.platform).toUpperCase();
    let client_id = env[`${connection.platform.toUpperCase()}_CLIENT_ID`] || env[`${credKey}_CLIENT_ID`];
    let client_secret = env[`${connection.platform.toUpperCase()}_CLIENT_SECRET`] || env[`${credKey}_CLIENT_SECRET`];

    if (connection.platform === 'tiktok') {
      client_id = client_id || env.TIKTOK_CLIENT_KEY || env.TIKTOK_CLIENT_ID;
      client_secret = client_secret || env.TIKTOK_CLIENT_SECRET;
    }
    if (connection.platform === 'threads') {
      client_id = client_id || env.THREADS_CLIENT_ID || env.THREADS_APP_ID || env.META_CLIENT_ID || env.FACEBOOK_APP_ID || env.FACEBOOK_CLIENT_ID;
      client_secret = client_secret || env.THREADS_CLIENT_SECRET || env.THREADS_APP_SECRET || env.META_CLIENT_SECRET || env.FACEBOOK_APP_SECRET || env.FACEBOOK_CLIENT_SECRET;
    }
    if (connection.platform === 'pinterest') {
      client_id = client_id || env.PINTEREST_CLIENT_ID || env.PINTEREST_APP_ID;
      client_secret = client_secret || env.PINTEREST_CLIENT_SECRET || env.PINTEREST_APP_SECRET;
    }

    if (!client_id || !client_secret) {
      console.error(`[REFRESH_MISSING_CREDENTIALS] ${connection.platform}:${connection.id} — client credentials missing in env`);
      return { success: false, status: 'missing_credentials' };
    }

    // X, Pinterest, and Canva require HTTP Basic auth — credentials must NOT appear in body
    const useBasicAuth = connection.platform === 'x' || connection.platform === 'pinterest' || connection.platform === 'canva';

    const headers = { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" };
    if (useBasicAuth) {
      headers["Authorization"] = `Basic ${btoa(`${client_id}:${client_secret}`)}`;
    }

    const tokenParams = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
    if (!useBasicAuth) {
      const clientIdParam = provider?.client_id_param || "client_id";
      tokenParams.set(clientIdParam, client_id);
      tokenParams.set("client_secret", client_secret);
    }

    const tokenEndpoint = provider?.endpoints?.token;
    if (!tokenEndpoint) {
      throw new Error(`No token endpoint configured for platform: ${connection.platform}`);
    }

    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers,
      body: tokenParams
    });

    let data = {};
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      // Differentiate transient provider failures / rate limits from permanent auth failures
      if (res.status === 429) {
        console.warn(`[REFRESH_RATE_LIMITED] ${connection.platform}:${connection.id} — rate limited (status 429)`);
        writeSystemEvent(env, {
          severity: 'warning',
          source: 'oauth',
          message: `Rate limited during token refresh for ${connection.platform}`,
          metadata: JSON.stringify({ platform: connection.platform, connection_id: connection.id, status: 429 })
        }).catch(() => {});
        return { success: false, status: 'rate_limited' };
      }

      if (res.status >= 500) {
        console.warn(`[REFRESH_PROVIDER_OUTAGE] ${connection.platform}:${connection.id} — provider outage (status ${res.status})`);
        writeSystemEvent(env, {
          severity: 'warning',
          source: 'oauth',
          message: `Provider outage during token refresh for ${connection.platform} (status ${res.status})`,
          metadata: JSON.stringify({ platform: connection.platform, connection_id: connection.id, status: res.status })
        }).catch(() => {});
        return { success: false, status: 'transient_outage' };
      }

      // Permanent authentication failures (400 Bad Request, 401 Unauthorized)
      const isRevoked = data.error === "invalid_grant" || data.error === "unauthorized_client";
      const status = isRevoked ? "revoked" : "error";
      await db.prepare("UPDATE social_connections SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(status, connection.id).run();
      writeSystemEvent(env, {
        severity: status === 'revoked' ? 'critical' : 'warning',
        source: 'oauth',
        message: `Token ${status} for ${connection.platform} (connection ${connection.id})`,
        metadata: JSON.stringify({ platform: connection.platform, connection_id: connection.id, error: data.error })
      }).catch(() => {});
      return { success: false, status };
    }

    // Defensive check: access_token must be present and a non-empty string
    if (!data.access_token || typeof data.access_token !== 'string') {
      console.error(`[REFRESH_INVALID_RESPONSE] ${connection.platform}:${connection.id} — missing access_token in response`);
      return { success: false, status: 'malformed_response' };
    }

    // Encrypt and update
    const access_enc = await encrypt(data.access_token, secret);
    // Refresh token rotation: only overwrite refresh_token if the provider issued a new one
    const refresh_enc = data.refresh_token ? await encrypt(data.refresh_token, secret) : connection.refresh_token;
    
    const expires_at = data.expires_in 
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : connection.expires_at;

    // Preserve CONNECTED_NEEDS_RESOURCE — a successful token refresh must not
    // silently promote the connection to active before the user picks a resource.
    const nextStatus = connection.status === 'CONNECTED_NEEDS_RESOURCE'
      ? 'CONNECTED_NEEDS_RESOURCE'
      : 'active';

    await db.prepare(`
      UPDATE social_connections SET
        access_token = ?,
        refresh_token = ?,
        expires_at = ?,
        status = ?,
        last_refreshed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(access_enc, refresh_enc, expires_at, nextStatus, connection.id).run();

    return { success: true };
  } catch (err) {
    console.error(`[REFRESH_FAILED] ${connection.platform}:${connection.account_id}`, err.message);
    // Network errors or unexpected runtime exceptions are transient — do NOT mark connection 'error'
    writeSystemEvent(env, {
      severity: 'warning',
      source: 'oauth',
      message: `Token refresh exception: ${connection.platform} — ${err.message}`,
      metadata: JSON.stringify({ platform: connection.platform, connection_id: connection.id, error: err.message })
    }).catch(() => {});
    return { success: false, error: err.message };
  }
}

/**
 * Run background sync (CRON triggered)
 * Refreshes all active tokens to maintain session health.
 */
export async function runBackgroundRefresh(env) {
  const db = getDB(env);
  
  // Find tokens with a known expiry that are expiring within the next 8 hours.
  // Connections with expires_at IS NULL (e.g. Meta long-lived tokens) are skipped —
  // they don't support standard refresh_token grant and will self-expire after ~60 days.
  const { results } = await db.prepare(`
    SELECT * FROM social_connections
    WHERE status IN ('active', 'CONNECTED_NEEDS_RESOURCE')
    AND expires_at IS NOT NULL
    AND expires_at < DATETIME('now', '+8 hours')
  `).all();

  console.log(`[REFRESH_MANAGER] Checking ${results.length} connections...`);

  for (const connection of results) {
    await refreshSocialConnection(db, connection, env);
  }
}

/**
 * Preemptive check before using a connection
 */
export async function ensureValidConnection(db, connection, env) {
  if (connection.status !== 'active') return connection;

  const now = Date.now();
  let expiry = null;
  if (connection.expires_at) {
    if (!isNaN(connection.expires_at)) {
      const val = Number(connection.expires_at);
      expiry = val < 10000000000 ? val * 1000 : val;
    } else {
      expiry = new Date(connection.expires_at).getTime();
    }
  }

  // Refresh ONLY when: expires_at < now + 5 minutes
  if (expiry && (expiry - now < 300000)) {
    console.log(`[REFRESH_PREEMPTIVE] Refreshing ${connection.platform}:${connection.id}`);
    const result = await refreshSocialConnection(db, connection, env);
    if (result.success) {
      // Fetch updated record
      const updated = await db.prepare("SELECT * FROM social_connections WHERE id = ?").bind(connection.id).first();
      return updated || connection;
    }
  }

  return connection;
}
