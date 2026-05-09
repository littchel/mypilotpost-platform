/**
 * Unified Social Integration Engine — Production Build
 * Handles state management, PKCE (X/Twitter), and standardized token lifecycle.
 */

import { getDB } from "../lib/db.js";
import { encrypt, decrypt } from "../lib/crypto.js";
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

  if (!provider) throw new Error(`Unsupported platform: ${platform}`);

  const state = crypto.randomUUID();
  const stateData = {
    brand_id,
    user_id,
    platform,
    timestamp: Date.now()
  };

  // PKCE Handling for X (Twitter)
  if (platform === 'x') {
    const pkce = await generatePKCE();
    stateData.code_verifier = pkce.verifier;
    provider.auth_params = {
      ...provider.auth_params,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256'
    };
  }

  // Store state in KV with 10 minute TTL
  await env.OAUTH_STATE.put(`state:${state}`, JSON.stringify(stateData), { expirationTtl: 600 });

  const authUrl = new URL(provider.endpoints.auth);
  authUrl.searchParams.set("client_id", env[`${platform.toUpperCase()}_CLIENT_ID`]);
  authUrl.searchParams.set("redirect_uri", `${env.BASE_URL}/api/oauth/${platform}/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  
  // Scopes standardization
  const scopes = provider.scopes || "";
  authUrl.searchParams.set("scope", scopes);

  // Platform specific params
  if (provider.auth_params) {
    Object.entries(provider.auth_params).forEach(([k, v]) => authUrl.searchParams.set(k, v));
  }

  // Force Google Select Account if needed
  if (platform === 'google') {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
  }

  return Response.redirect(authUrl.toString());
}

/**
 * Handle Unified OAuth Callback
 */
export async function handleUnifiedCallback(request, env) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  const { code, state, error } = query;
  const platform = url.pathname.split("/")[2]; // /api/oauth/:platform/callback

  if (error) throw new Error(`OAuth Error from ${platform}: ${error}`);
  if (!code || !state) throw new Error("Missing code or state");

  // Validate State from KV
  const storedState = await env.OAUTH_STATE.get(`state:${state}`);
  if (!storedState) throw new Error("Invalid or expired OAuth state");
  
  const { brand_id, user_id, code_verifier } = JSON.parse(storedState);
  await env.OAUTH_STATE.delete(`state:${state}`); // Consume state

  const provider = getProvider(platform);
  const client_id = env[`${platform.toUpperCase()}_CLIENT_ID`];
  const client_secret = env[`${platform.toUpperCase()}_CLIENT_SECRET`];

  // Token Exchange
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${env.BASE_URL}/api/oauth/${platform}/callback`,
    client_id,
    client_secret
  });

  if (code_verifier) {
    tokenParams.set("code_verifier", code_verifier);
  }

  const tokenRes = await fetch(provider.endpoints.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: tokenParams
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(tokenData.error_description || tokenData.error || "Token exchange failed");

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
  const access_enc = await encrypt(tokenData.access_token, env.ENCRYPTION_SECRET);
  const refresh_enc = tokenData.refresh_token ? await encrypt(tokenData.refresh_token, env.ENCRYPTION_SECRET) : null;
  
  const expires_at = tokenData.expires_in 
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : (tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null);

  // Persistence logic with Duplicate Protection (UPSERT)
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
      status = 'active',
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

  // Redirect back to dashboard with success
  return c.redirect(`${env.FRONTEND_URL}/settings/connections?success=${platform}`);
}
