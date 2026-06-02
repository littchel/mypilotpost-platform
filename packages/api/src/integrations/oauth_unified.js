/**
 * Unified Social Integration Engine — Production Build
 * Handles state management, PKCE (Canva + X/Twitter), and standardized token lifecycle.
 */

import { getDB } from "../lib/db.js";
import { encrypt } from "../lib/crypto.js";
import { getProvider } from "./registry.js";
import { getAdapter } from "./providers/index.js";

/**
 * Generate PKCE Code Verifier and Challenge (SHA-256)
 */
async function generatePKCE() {
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { verifier, challenge };
}

/**
 * Start OAuth Flow for any platform
 */
export async function startUnifiedOAuth(request, env, userContext) {
  const { brand_id, user_id } = userContext;
  const url = new URL(request.url);
  const platform = url.pathname.split("/")[3]; // /api/oauth/:platform/connect
  const provider = getProvider(platform);
  if (!provider) {
    return new Response(JSON.stringify({ error: `Unsupported platform: ${platform}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (provider.disabled) {
    return new Response(JSON.stringify({
      error: `${provider.name || platform} is not yet available. Approval in progress.`
    }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const state = crypto.randomUUID();
  const stateData = {
    brand_id,
    user_id,
    platform,
    timestamp: Date.now()
  };

  // PKCE Handling — Canva requires PKCE; X (Twitter) requires it too
  // code_verifier stored in KV state; code_challenge appended to auth URL
  const PKCE_PLATFORMS = ['x', 'canva'];
  let pkceChallenge = null;
  if (PKCE_PLATFORMS.includes(platform)) {
    const pkce = await generatePKCE();
    stateData.code_verifier = pkce.verifier;
    pkceChallenge = pkce.challenge;
    console.log(`[OAUTH_PKCE] platform=${platform} challenge_generated=true`);
  }

  // Store state in KV with 10 minute TTL
  await env.OAUTH_STATE.put(`state:${state}`, JSON.stringify(stateData), { expirationTtl: 600 });

  const credKey = provider.credential_key || platform.toUpperCase();
  const client_id = env[`${credKey}_CLIENT_ID`];
  const client_secret = env[`${credKey}_CLIENT_SECRET`];

  // Defensive: catch missing credentials before Google sees an undefined client_id
  // (undefined client_id produces 401: deleted_client or invalid_client from Google)
  if (!client_id) {
    console.error(`[OAUTH_MISSING_CREDENTIAL] ${platform}: ${credKey}_CLIENT_ID is not set in Worker environment`);
    return new Response(JSON.stringify({
      error: `OAuth credentials not configured for ${platform}. Please contact support.`,
      debug: `Missing env var: ${credKey}_CLIENT_ID`
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!client_secret) {
    console.error(`[OAUTH_MISSING_CREDENTIAL] ${platform}: ${credKey}_CLIENT_SECRET is not set in Worker environment`);
    return new Response(JSON.stringify({
      error: `OAuth credentials not configured for ${platform}. Please contact support.`,
      debug: `Missing env var: ${credKey}_CLIENT_SECRET`
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const redirectUri = `${env.BASE_URL}/api/oauth/${platform}/callback`;
  console.log(`[OAUTH_START] platform=${platform} credKey=${credKey} redirect_uri=${redirectUri} pkce=${!!pkceChallenge} scopes="${provider.scopes}"`);

  // Meta-specific scope audit logs — verify separation before URL is built
  if (platform === 'facebook' || platform === 'meta') {
    console.log(`[META_FACEBOOK_SCOPES] platform=${platform} scopes="${provider.scopes}"`);
    const hasInstagramScope = provider.scopes.includes('instagram_');
    if (hasInstagramScope) {
      console.error(`[META_FACEBOOK_SCOPES] SCOPE_CONTAMINATION DETECTED — instagram_* scopes found in facebook flow: "${provider.scopes}"`);
    }
  }
  if (platform === 'instagram') {
    console.log(`[META_INSTAGRAM_SCOPES] platform=${platform} scopes="${provider.scopes}"`);
    const hasFacebookOnlyScope = /pages_manage_posts|pages_manage_metadata|pages_read_engagement/.test(provider.scopes);
    if (hasFacebookOnlyScope) {
      console.warn(`[META_INSTAGRAM_SCOPES] WARNING — facebook-only scopes detected in instagram flow: "${provider.scopes}"`);
    }
  }

  const authUrl = new URL(provider.endpoints.auth);
  authUrl.searchParams.set(provider.client_id_param || "client_id", client_id);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  // Scopes standardization — only set if provider defines scopes
  if (provider.scopes) {
    authUrl.searchParams.set("scope", provider.scopes);
  }

  // Platform-specific static params from registry
  if (provider.auth_params) {
    Object.entries(provider.auth_params).forEach(([k, v]) => authUrl.searchParams.set(k, v));
  }

  // PKCE challenge appended directly to URL — registry object untouched
  if (pkceChallenge) {
    authUrl.searchParams.set("code_challenge", pkceChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
  }

  // All Google providers require offline access to get a refresh_token
  const GOOGLE_PLATFORMS = ['google', 'google_drive', 'google_business', 'google_analytics', 'youtube', 'google_search_console'];
  if (GOOGLE_PLATFORMS.includes(platform)) {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
  }

  // Meta OAuth URL audit log — printed after full URL construction
  if (platform === 'facebook' || platform === 'instagram' || platform === 'meta') {
    console.log(`[META_OAUTH_URL] platform=${platform} url="${authUrl.toString()}"`);
  }

  // Return JSON so SPA can fetch with Authorization header then navigate
  return new Response(JSON.stringify({ url: authUrl.toString() }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Handle Unified OAuth Callback
 */
export async function handleUnifiedCallback(request, env) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  const { code, state, error } = query;
  const platform = url.pathname.split("/")[3]; // /api/oauth/:platform/callback → ["","api","oauth","linkedin","callback"]

  const failRedirect = (msg) =>
    Response.redirect(`${env.FRONTEND_URL}?oauth_error=${encodeURIComponent(msg)}`, 302);

  if (error) return failRedirect(`OAuth error from ${platform}: ${error}`);
  if (!code || !state) return failRedirect("Missing code or state");

  try {

  // Validate State from KV
  const storedState = await env.OAUTH_STATE.get(`state:${state}`);
  if (!storedState) throw new Error("Invalid or expired OAuth state");
  
  const { brand_id, user_id, code_verifier } = JSON.parse(storedState);
  await env.OAUTH_STATE.delete(`state:${state}`); // Consume state

  const provider = getProvider(platform);
  if (!provider) throw new Error(`Unsupported platform: ${platform}`);
  const credKey = provider.credential_key || platform.toUpperCase();
  const client_id = env[`${credKey}_CLIENT_ID`];
  const client_secret = env[`${credKey}_CLIENT_SECRET`];

  if (!client_id || !client_secret) {
    console.error(`[OAUTH_CALLBACK_MISSING_CRED] ${platform}: ${credKey}_CLIENT_ID=${!!client_id} ${credKey}_CLIENT_SECRET=${!!client_secret}`);
    throw new Error(`OAuth credentials not configured for ${platform} (${credKey}_CLIENT_ID or _SECRET missing)`);
  }

  // Canva and X require PKCE — a missing verifier means state was written without PKCE, which is a bug
  const PKCE_PLATFORMS = ['x', 'canva'];
  if (PKCE_PLATFORMS.includes(platform) && !code_verifier) {
    console.error(`[OAUTH_PKCE_MISSING] platform=${platform} code_verifier absent from KV state — this request will fail token exchange`);
    throw new Error(`PKCE code_verifier missing for ${platform}. Clear browser cookies and retry.`);
  }

  const redirectUri = `${env.BASE_URL}/api/oauth/${platform}/callback`;
  const hasPkce = !!code_verifier;
  console.log(`[OAUTH_CALLBACK] platform=${platform} credKey=${credKey} redirect_uri=${redirectUri} has_code_verifier=${hasPkce}`);

  // Token Exchange
  // X (Twitter) and Pinterest require HTTP Basic auth; credentials must NOT appear in body
  const useBasicAuth = platform === 'x' || platform === 'pinterest';

  const clientIdParamName = provider.client_id_param || "client_id";
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    ...(useBasicAuth ? {} : { [clientIdParamName]: client_id, client_secret })
  });

  if (code_verifier) {
    tokenParams.set("code_verifier", code_verifier);
  }

  const tokenHeaders = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json"
  };
  if (useBasicAuth) {
    tokenHeaders["Authorization"] = `Basic ${btoa(`${client_id}:${client_secret}`)}`;
  }

  const tokenRes = await fetch(provider.endpoints.token, {
    method: "POST",
    headers: tokenHeaders,
    body: tokenParams
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    const rawErr = tokenData.error;
    const errMsg = tokenData.error_description ||
      (rawErr && typeof rawErr === 'object' ? rawErr.message : rawErr) ||
      "Token exchange failed";
    console.error(`[OAUTH_TOKEN_EXCHANGE_FAILED] platform=${platform} status=${tokenRes.status} error=${JSON.stringify(rawErr)} desc=${tokenData.error_description} redirect_uri=${redirectUri}`);
    throw new Error(errMsg);
  }

  // Adapter Normalization (Meta Page Token Exchange, X Username, etc.)
  const adapter = getAdapter(platform);
  let normalized = {
    account_id: tokenData.user_id || tokenData.id || "unknown",
    platform_username: platform,
    meta: {}
  };

  if (adapter && adapter.normalize) {
    normalized = await adapter.normalize(tokenData, env);
  }

  // SECURITY: Encrypt Tokens (AES-GCM 256)
  if (!env.ENCRYPTION_SECRET) throw new Error("ENCRYPTION_SECRET not set in Worker environment");
  if (!tokenData.access_token) throw new Error(`Token exchange succeeded but no access_token returned by ${platform}`);
  const access_enc = await encrypt(tokenData.access_token, env.ENCRYPTION_SECRET);
  const refresh_enc = tokenData.refresh_token ? await encrypt(tokenData.refresh_token, env.ENCRYPTION_SECRET) : null;
  
  const expires_at = tokenData.expires_in 
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : (tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null);

  // Persistence logic with Duplicate Protection (UPSERT)
  const db = getDB(env);
  const connection_id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO social_connections (
      id, user_id, brand_id, platform, account_id, platform_username,
      access_token, refresh_token, expires_at, scopes, status, meta, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(brand_id, platform, account_id) DO UPDATE SET
      platform_username = excluded.platform_username,
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, social_connections.refresh_token),
      expires_at = excluded.expires_at,
      scopes = excluded.scopes,
      status = CASE
        WHEN social_connections.status IN ('CONNECTED_NEEDS_RESOURCE', 'pending')
        THEN social_connections.status
        ELSE 'active'
        END,
      meta = excluded.meta,
      updated_at = CURRENT_TIMESTAMP,
      last_refreshed_at = CURRENT_TIMESTAMP
  `).bind(
    connection_id,
    user_id,
    brand_id,
    platform,
    normalized.account_id,
    normalized.platform_username,
    access_enc,
    refresh_enc,
    expires_at,
    tokenData.scope || provider.scopes,
    JSON.stringify(normalized.meta || {})
  ).run();

    // Platforms that require resource selection before becoming usable.
    // linkedin_personal publishes as the authenticated member — no picker needed.
    // linkedin_pages selects a company page once the Community Management API is approved.
    // UPSERT conflict path keeps the original row id — query by unique key to get it.
    const NEEDS_SELECTION = ["google_analytics", "google_search_console", "google_business", "linkedin_pages"];
    if (NEEDS_SELECTION.includes(platform)) {
      const actual = await db.prepare(
        `SELECT id, selected_resource_id FROM social_connections
         WHERE brand_id = ? AND platform = ? AND account_id = ?`
      ).bind(brand_id, platform, normalized.account_id).first();
      const actual_id = actual?.id || connection_id;

      if (!actual?.selected_resource_id) {
        await db.prepare(
          `UPDATE social_connections SET status = 'CONNECTED_NEEDS_RESOURCE' WHERE id = ?`
        ).bind(actual_id).run();
        return Response.redirect(
          `${env.FRONTEND_URL}?oauth_success=${platform}&needs_selection=1&conn_id=${actual_id}`,
          302
        );
      }
    }

    return Response.redirect(`${env.FRONTEND_URL}?oauth_success=${platform}`, 302);
  } catch (err) {
    console.error(`[OAUTH_CALLBACK_FAILED] ${platform}:`, err.message || err);
    return Response.redirect(`${env.FRONTEND_URL}?oauth_error=${encodeURIComponent(err.message || String(err) || 'OAuth failed')}`, 302);
  }
}
