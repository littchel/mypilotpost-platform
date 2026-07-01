/**
 * Unified Social Integration Engine — Production Build
 * Handles state management, PKCE (Canva + X/Twitter), and standardized token lifecycle.
 */

import { getDB } from "../lib/db.js";
import { encrypt } from "../lib/crypto.js";
import { getProvider } from "./registry.js";
import { getAdapter } from "./providers/index.js";
import { listPinterestBoards } from "./google-accounts.js";
import { checkAndIncrement } from "../core/billing/enforcement.js";

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

  // PKCE Handling — Canva, X (Twitter), and TikTok require PKCE
  // code_verifier stored in KV state; code_challenge appended to auth URL
  const PKCE_PLATFORMS = ['x', 'canva', 'tiktok'];
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
  let client_id = env[`${platform.toUpperCase()}_CLIENT_ID`] || env[`${credKey}_CLIENT_ID`];
  let client_secret = env[`${platform.toUpperCase()}_CLIENT_SECRET`] || env[`${credKey}_CLIENT_SECRET`];
  if (platform === 'tiktok') {
    client_id = client_id || env.TIKTOK_CLIENT_KEY || env.TIKTOK_CLIENT_ID;
    client_secret = client_secret || env.TIKTOK_CLIENT_SECRET;
  }
  if (platform === 'threads') {
    client_id = client_id || env.THREADS_CLIENT_ID || env.THREADS_APP_ID || env.META_CLIENT_ID || env.FACEBOOK_APP_ID || env.FACEBOOK_CLIENT_ID;
    client_secret = client_secret || env.THREADS_CLIENT_SECRET || env.THREADS_APP_SECRET || env.META_CLIENT_SECRET || env.FACEBOOK_APP_SECRET || env.FACEBOOK_CLIENT_SECRET;
  }
  if (platform === 'pinterest') {
    client_id = client_id || env.PINTEREST_APP_ID;
    client_secret = client_secret || env.PINTEREST_APP_SECRET;
  }

  // Defensive: catch missing credentials before Google/Meta sees an undefined client_id
  if (!client_id) {
    console.error(`[OAUTH_MISSING_CREDENTIAL] ${platform}: ${platform.toUpperCase()}_CLIENT_ID or ${credKey}_CLIENT_ID is not set in Worker environment`);
    return new Response(JSON.stringify({
      error: `OAuth credentials not configured for ${platform}. Please contact support.`,
      debug: `Missing env var: ${platform.toUpperCase()}_CLIENT_ID or ${credKey}_CLIENT_ID`
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!client_secret) {
    console.error(`[OAUTH_MISSING_CREDENTIAL] ${platform}: ${platform.toUpperCase()}_CLIENT_SECRET or ${credKey}_CLIENT_SECRET is not set in Worker environment`);
    return new Response(JSON.stringify({
      error: `OAuth credentials not configured for ${platform}. Please contact support.`,
      debug: `Missing env var: ${platform.toUpperCase()}_CLIENT_SECRET or ${credKey}_CLIENT_SECRET`
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
  let client_id = env[`${platform.toUpperCase()}_CLIENT_ID`] || env[`${credKey}_CLIENT_ID`];
  let client_secret = env[`${platform.toUpperCase()}_CLIENT_SECRET`] || env[`${credKey}_CLIENT_SECRET`];
  if (platform === 'tiktok') {
    client_id = client_id || env.TIKTOK_CLIENT_KEY || env.TIKTOK_CLIENT_ID;
    client_secret = client_secret || env.TIKTOK_CLIENT_SECRET;
  }
  if (platform === 'threads') {
    client_id = client_id || env.THREADS_CLIENT_ID || env.THREADS_APP_ID || env.META_CLIENT_ID || env.FACEBOOK_APP_ID || env.FACEBOOK_CLIENT_ID;
    client_secret = client_secret || env.THREADS_CLIENT_SECRET || env.THREADS_APP_SECRET || env.META_CLIENT_SECRET || env.FACEBOOK_APP_SECRET || env.FACEBOOK_CLIENT_SECRET;
  }
  if (platform === 'pinterest') {
    client_id = client_id || env.PINTEREST_APP_ID;
    client_secret = client_secret || env.PINTEREST_APP_SECRET;
  }

  if (!client_id || !client_secret) {
    console.error(`[OAUTH_CALLBACK_MISSING_CRED] ${platform}: client_id=${!!client_id} client_secret=${!!client_secret}`);
    throw new Error(`OAuth credentials not configured for ${platform} (${platform.toUpperCase()}_CLIENT_ID or _SECRET or ${credKey}_CLIENT_ID or _SECRET missing)`);
  }

  // Canva, X, and TikTok require PKCE — a missing verifier means state was written without PKCE, which is a bug
  const PKCE_PLATFORMS = ['x', 'canva', 'tiktok'];
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
    if (platform === "pinterest") {
      const actual = await db.prepare(
        `SELECT id, selected_resource_id FROM social_connections
         WHERE brand_id = ? AND platform = ? AND account_id = ?`
      ).bind(brand_id, platform, normalized.account_id).first();
      const target_id = actual?.id || connection_id;

      if (actual?.selected_resource_id) {
        // Already selected previously, keep active
        await db.prepare(
          `UPDATE social_connections SET status = 'active' WHERE id = ?`
        ).bind(target_id).run();
        return Response.redirect(`${env.FRONTEND_URL}?oauth_success=${platform}`, 302);
      }

      try {
        const boards = await listPinterestBoards(tokenData.access_token);
        if (boards.length === 1) {
          const board = boards[0];
          await db.prepare(`
            UPDATE social_connections 
            SET selected_resource_id = ?,
                selected_resource_name = ?,
                resource_type = 'board',
                status = 'active',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(board.id, board.name, target_id).run();
          
          return Response.redirect(`${env.FRONTEND_URL}?oauth_success=${platform}`, 302);
        } else {
          await db.prepare(
            `UPDATE social_connections SET status = 'CONNECTED_NEEDS_RESOURCE' WHERE id = ?`
          ).bind(target_id).run();
          
          return Response.redirect(
            `${env.FRONTEND_URL}?oauth_success=${platform}&needs_selection=1&conn_id=${target_id}`,
            302
          );
        }
      } catch (err) {
        console.error("[OAUTH_CALLBACK_PINTEREST_BOARD_FETCH_FAILED]", err);
        await db.prepare(
          `UPDATE social_connections SET status = 'CONNECTED_NEEDS_RESOURCE' WHERE id = ?`
        ).bind(target_id).run();
        return Response.redirect(
          `${env.FRONTEND_URL}?oauth_success=${platform}&needs_selection=1&conn_id=${target_id}`,
          302
        );
      }
    }

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

/**
 * WordPress Custom Connect Handler
 * Verifies credentials, encrypts basic auth header, and stores connection in social_connections.
 */
export async function connectWordPressCustom(request, env, userContext) {
  const { brand_id, user_id } = userContext;
  
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { blog_url, username, application_password } = body;
  if (!blog_url || !username || !application_password) {
    return new Response(JSON.stringify({ error: "blog_url, username, and application_password are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  let cleanUrl = blog_url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = "https://" + cleanUrl;
  }

  const cleanBlogUrl = cleanUrl.replace(/^https?:\/\//i, "");
  const authHeader = "Basic " + btoa(`${username}:${application_password}`);

  const wpUrl = `${cleanUrl}/wp-json/wp/v2/users/me`;
  console.log(`[WP_CONNECT] Verifying credentials at ${wpUrl}`);
  
  try {
    const wpRes = await fetch(wpUrl, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json",
        "User-Agent": "myPilotPost/1.0"
      }
    });

    if (!wpRes.ok) {
      const errText = await wpRes.text().catch(() => "");
      console.error(`[WP_CONNECT_FAILED] status=${wpRes.status} body=${errText}`);
      let errorMessage = "WordPress verification failed. Please check your URL, username, and application password.";
      try {
        const errJson = JSON.parse(errText);
        if (errJson.message) {
          errorMessage = `WordPress Error: ${errJson.message}`;
        }
      } catch (e) {}
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const wpUser = await wpRes.json();
    const userId = wpUser.id;
    const wpUsername = wpUser.name || wpUser.slug || username;

    const account_id = `${cleanBlogUrl}:${userId}`;
    const platform_username = `${wpUsername} (${cleanBlogUrl})`;

    if (!env.ENCRYPTION_SECRET) {
      throw new Error("ENCRYPTION_SECRET not set in Worker environment");
    }
    const access_enc = await encrypt(authHeader, env.ENCRYPTION_SECRET);

    const db = getDB(env);
    const connection_id = crypto.randomUUID();

    // Check quota if it is a new connection
    const existingConnection = await db.prepare(`
      SELECT 1 FROM social_connections
      WHERE brand_id = ? AND platform = 'wordpress' AND account_id = ? AND status != 'disconnected'
      LIMIT 1
    `).bind(brand_id, account_id).first();

    if (!existingConnection) {
      await checkAndIncrement(db, user_id, 'accounts');
    }

    const meta = {
      blog_url: cleanUrl,
      username: username,
      user_id: userId
    };

    await db.prepare(`
      INSERT INTO social_connections (
        id, user_id, brand_id, platform, account_id, platform_username,
        access_token, refresh_token, expires_at, scopes, status, meta, updated_at
      ) VALUES (?, ?, ?, 'wordpress', ?, ?, ?, NULL, NULL, 'global', 'active', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(brand_id, platform, account_id) DO UPDATE SET
        platform_username = excluded.platform_username,
        access_token = excluded.access_token,
        status = 'active',
        meta = excluded.meta,
        updated_at = CURRENT_TIMESTAMP,
        last_refreshed_at = CURRENT_TIMESTAMP
    `).bind(
      connection_id,
      user_id,
      brand_id,
      account_id,
      platform_username,
      access_enc,
      JSON.stringify(meta)
    ).run();

    return new Response(JSON.stringify({ success: true, account_id, platform_username }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[WP_CONNECT_ERROR]", err);
    return new Response(JSON.stringify({ error: `Connection failed: ${err.message || String(err)}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * WordPress eCommerce (WooCommerce) Custom Connect Handler
 * Verifies WooCommerce credentials (ck_* and cs_*), encrypts the basic auth header, and stores it in social_connections.
 */
export async function connectWordPressEcommerceCustom(request, env, userContext) {
  const { brand_id, user_id } = userContext;
  
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { store_url, consumer_key, consumer_secret } = body;
  if (!store_url || !consumer_key || !consumer_secret) {
    return new Response(JSON.stringify({ error: "store_url, consumer_key, and consumer_secret are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  let cleanUrl = store_url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = "https://" + cleanUrl;
  }

  const cleanStoreUrl = cleanUrl.replace(/^https?:\/\//i, "");
  const authHeader = "Basic " + btoa(`${consumer_key}:${consumer_secret}`);

  // Verification endpoint: system_status
  const wcUrl = `${cleanUrl}/wp-json/wc/v3/system_status`;
  console.log(`[WC_CONNECT] Verifying credentials at ${wcUrl}`);
  
  try {
    let wpRes = await fetch(wcUrl, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json",
        "User-Agent": "myPilotPost/1.0"
      }
    });

    // Fallback try for products endpoint (in case system_status permissions are restricted or blocked by security plugins)
    if (!wpRes.ok) {
      console.warn(`[WC_CONNECT_WARN] system_status endpoint failed with status=${wpRes.status}. Trying fallback products endpoint.`);
      const fallbackUrl = `${cleanUrl}/wp-json/wc/v3/products?per_page=1`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "GET",
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json",
          "User-Agent": "myPilotPost/1.0"
        }
      });
      if (fallbackRes.ok) {
        wpRes = fallbackRes;
      }
    }

    if (!wpRes.ok) {
      const errText = await wpRes.text().catch(() => "");
      console.error(`[WC_CONNECT_FAILED] status=${wpRes.status} body=${errText}`);
      let errorMessage = "WooCommerce verification failed. Please check your Store URL, Consumer Key, and Consumer Secret.";
      try {
        const errJson = JSON.parse(errText);
        if (errJson.message) {
          errorMessage = `WooCommerce Error: ${errJson.message}`;
        }
      } catch (e) {}
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Try to extract site title from system_status or default
    let siteTitle = "WooCommerce Store";
    try {
      const wpData = await wpRes.json();
      if (wpData.environment?.site_title) {
        siteTitle = wpData.environment.site_title;
      } else if (Array.isArray(wpData)) {
        // From fallback products list, we don't have store metadata easily, just use url
        siteTitle = "WooCommerce Store";
      }
    } catch (e) {}

    const account_id = cleanStoreUrl;
    const platform_username = `${siteTitle} (${cleanStoreUrl})`;

    if (!env.ENCRYPTION_SECRET) {
      throw new Error("ENCRYPTION_SECRET not set in Worker environment");
    }
    const access_enc = await encrypt(authHeader, env.ENCRYPTION_SECRET);

    const db = getDB(env);
    const connection_id = crypto.randomUUID();

    // Check quota if it is a new connection
    const existingConnection = await db.prepare(`
      SELECT 1 FROM social_connections
      WHERE brand_id = ? AND platform = 'wordpress_ecommerce' AND account_id = ? AND status != 'disconnected'
      LIMIT 1
    `).bind(brand_id, account_id).first();

    if (!existingConnection) {
      await checkAndIncrement(db, user_id, 'accounts');
    }

    const meta = {
      store_url: cleanUrl,
      consumer_key: consumer_key,
      site_title: siteTitle
    };

    await db.prepare(`
      INSERT INTO social_connections (
        id, user_id, brand_id, platform, account_id, platform_username,
        access_token, refresh_token, expires_at, scopes, status, meta, updated_at
      ) VALUES (?, ?, ?, 'wordpress_ecommerce', ?, ?, ?, NULL, NULL, 'global', 'active', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(brand_id, platform, account_id) DO UPDATE SET
        platform_username = excluded.platform_username,
        access_token = excluded.access_token,
        status = 'active',
        meta = excluded.meta,
        updated_at = CURRENT_TIMESTAMP,
        last_refreshed_at = CURRENT_TIMESTAMP
    `).bind(
      connection_id,
      user_id,
      brand_id,
      account_id,
      platform_username,
      access_enc,
      JSON.stringify(meta)
    ).run();

    return new Response(JSON.stringify({ success: true, account_id, platform_username }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[WC_CONNECT_ERROR]", err);
    return new Response(JSON.stringify({ error: `Connection failed: ${err.message || String(err)}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}


