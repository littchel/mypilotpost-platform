/**
 * Unified Social Token Refresh Manager
 * Handles scheduled background refreshes and preemptive on-demand refreshing.
 */

import { getDB } from "../lib/db.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { getProvider } from "./registry.js";

/**
 * Refresh a single social connection
 */
export async function refreshSocialConnection(db, connection, env) {
  const provider = getProvider(connection.platform);
  const secret = env.ENCRYPTION_SECRET;

  // Connections without a refresh_token (e.g. Meta long-lived tokens) cannot be refreshed
  // via standard grant. Return early — do NOT set status='error'.
  if (!connection.refresh_token) {
    console.warn(`[REFRESH_SKIP] ${connection.platform}:${connection.id} — no refresh_token, skipping`);
    return { success: false, status: 'no_refresh_token' };
  }

  try {
    const refreshToken = await decrypt(connection.refresh_token, secret);

    const credKey = (provider.credential_key || connection.platform).toUpperCase();
    const client_id = env[`${credKey}_CLIENT_ID`];
    const client_secret = env[`${credKey}_CLIENT_SECRET`];

    // X and Pinterest require HTTP Basic auth — credentials must NOT appear in body
    const useBasicAuth = connection.platform === 'x' || connection.platform === 'pinterest';

    const headers = { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" };
    if (useBasicAuth) {
      headers["Authorization"] = `Basic ${btoa(`${client_id}:${client_secret}`)}`;
    }

    const tokenParams = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
    if (!useBasicAuth) {
      tokenParams.set("client_id", client_id);
      tokenParams.set("client_secret", client_secret);
    }

    const res = await fetch(provider.endpoints.token, {
      method: "POST",
      headers,
      body: tokenParams
    });

    const data = await res.json();

    if (!res.ok) {
      const status = (data.error === "invalid_grant") ? "revoked" : "error";
      await db.prepare("UPDATE social_connections SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(status, connection.id).run();
      return { success: false, status };
    }

    // Encrypt and update
    const access_enc = await encrypt(data.access_token, secret);
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
    console.error(`[REFRESH_FAILED] ${connection.platform}:${connection.account_id}`, err);
    await db.prepare("UPDATE social_connections SET status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(connection.id).run();
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
  const expiry = connection.expires_at ? new Date(connection.expires_at).getTime() : null;

  // Refresh ONLY when: expires_at < now + 5 minutes
  if (expiry && (expiry - now < 300000)) {
    console.log(`[REFRESH_PREEMPTIVE] Refreshing ${connection.platform}:${connection.id}`);
    await refreshSocialConnection(db, connection, env);
    
    // Fetch updated record
    return await db.prepare("SELECT * FROM social_connections WHERE id = ?").bind(connection.id).first();
  }

  return connection;
}
