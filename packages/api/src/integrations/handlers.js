import { json, error } from "../lib/json.js";
import { getDB } from "../lib/db.js";
import { generateState, verifyAndConsumeState, exchangeCode, saveConnection } from "./engine.js";
import { PROVIDERS } from "./registry.js";
import { isValidUUID } from "../lib/validation.js";
import { refreshSocialConnection } from "./refresh_manager.js";

/**
 * GET /api/customer/oauth/:provider/start
 */
export async function startOAuth(request, env, auth) {
  const providerKey = request.params.provider;
  if (!PROVIDERS[providerKey]) return error("Unknown provider", "UNKNOWN_PROVIDER", null, 400);

  try {
    const stateId = await generateState(auth.brand_id, auth.user_id, providerKey, env);
    const provider = PROVIDERS[providerKey];
    
    const client_id = env[`${providerKey.toUpperCase()}_CLIENT_ID`];
    const redirect_uri = `${env.BASE_URL}/api/customer/oauth/${providerKey}/callback`;
    
    // Construct Auth URL (Simplified - some providers need more specific scopes/params)
    const authUrl = new URL(provider.endpoints.auth);
    authUrl.searchParams.set("client_id", client_id);
    authUrl.searchParams.set("redirect_uri", redirect_uri);
    authUrl.searchParams.set("state", stateId);
    authUrl.searchParams.set("response_type", "code");
    
    // Add default scopes based on type
    if (providerKey === "linkedin") authUrl.searchParams.set("scope", "r_liteprofile r_emailaddress w_member_social");
    if (providerKey === "facebook") authUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,pages_manage_posts");

    return json({ url: authUrl.toString() });
  } catch (err) {
    console.error("OAuth Start Error:", err);
    return error("Failed to initiate OAuth", "OAUTH_INIT_ERROR", null, 500);
  }
}

/**
 * GET /api/customer/oauth/:provider/callback
 */
export async function handleCallback(request, env) {
  const providerKey = request.params.provider;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateId = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) return error(`Provider error: ${providerError}`, "OAUTH_PROVIDER_ERROR", null, 400);
  if (!code || !stateId) return error("Missing code or state", "OAUTH_INVALID_REQUEST", null, 400);

  try {
    // 1. Verify and consume state (Enforces brand isolation and one-time use)
    const statePayload = await verifyAndConsumeState(stateId, env);
    
    // 2. Exchange code for tokens
    const tokenData = await exchangeCode(providerKey, code, env);
    
    // 3. Persist connection
    await saveConnection(statePayload.brand_id, statePayload.user_id, providerKey, tokenData, env);

    // 4. Redirect to frontend with success
    const successUrl = `${env.FRONTEND_URL || env.BASE_URL}/integrations?status=success&provider=${providerKey}`;
    return Response.redirect(successUrl, 302);
  } catch (err) {
    console.error("OAuth Callback Error:", err);
    const failureUrl = `${env.FRONTEND_URL || env.BASE_URL}/integrations?status=error&message=${encodeURIComponent(err.message)}`;
    return Response.redirect(failureUrl, 302);
  }
}

/**
 * GET /api/customer/integrations
 */
export async function listIntegrations(request, env, auth) {
  const db = getDB(env);

  const result = await db.prepare(`
    SELECT
      id,
      provider,
      provider_type,
      provider_account_name,
      status,
      token_expires_at,
      created_at
    FROM connected_accounts
    WHERE brand_id = ? AND status != 'disconnected'
    ORDER BY created_at DESC
  `).bind(auth.brand_id).all();

  const integrations = (result.results || []).map(row => ({
    id: row.id,
    provider: row.provider,
    type: row.provider_type,
    account_name: row.provider_account_name,
    status: row.status,
    expires_at: row.token_expires_at,
    created_at: row.created_at
  }));

  return json({ integrations });
}

/**
 * DELETE /api/customer/integrations/:id
 */
export async function disconnectIntegration(request, env, auth) {
  const id = request.params.id;
  if (!isValidUUID(id)) return error("Invalid integration ID", "INVALID_ID", null, 400);

  const db = getDB(env);

  // Soft disconnect with brand isolation
  const result = await db.prepare(`
    UPDATE connected_accounts 
    SET 
      status = 'disconnected', 
      access_token_encrypted = NULL, 
      refresh_token_encrypted = NULL, 
      disconnected_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND brand_id = ?
  `).bind(id, auth.brand_id).run();

  if (!result.meta.changes) return error("Integration not found or unauthorized", "NOT_FOUND", null, 404);

  return json({ success: true, message: "Integration disconnected" });
}

/**
 * GET /api/customer/social-connections
 * Reads from the unified social_connections table (written by oauth_unified.js).
 */
export async function listSocialConnections(request, env, auth) {
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT
      id,
      platform,
      platform_username,
      account_id,
      status,
      expires_at,
      last_refreshed_at,
      scopes,
      meta,
      created_at
    FROM social_connections
    WHERE brand_id = ? AND status != 'disconnected'
    ORDER BY created_at DESC
  `).bind(auth.brand_id).all();

  const connections = (results || []).map(row => ({
    id: row.id,
    platform: row.platform,
    platform_username: row.platform_username || row.account_id,
    status: row.status,
    expires_at: row.expires_at,
    last_refreshed_at: row.last_refreshed_at,
    meta: row.meta ? JSON.parse(row.meta) : {}
  }));

  return json({ connections });
}

/**
 * GET /api/customer/social-connections/:id
 * Returns a single connection by ID, scoped to the authenticated brand.
 */
export async function getSocialConnectionById(request, env, auth) {
  const id = request.params?.id;
  if (!id || !isValidUUID(id)) return error("Invalid connection ID", "INVALID_ID", null, 400);

  const db = getDB(env);
  const row = await db.prepare(`
    SELECT id, platform, platform_username, account_id, status,
           expires_at, last_refreshed_at, scopes, meta, created_at
    FROM social_connections
    WHERE id = ? AND brand_id = ? AND status != 'disconnected'
  `).bind(id, auth.brand_id).first();

  if (!row) return error("Connection not found", "NOT_FOUND", null, 404);

  return json({
    id: row.id,
    platform: row.platform,
    platform_username: row.platform_username || row.account_id,
    status: row.status,
    expires_at: row.expires_at,
    last_refreshed_at: row.last_refreshed_at,
    meta: row.meta ? JSON.parse(row.meta) : {}
  });
}

/**
 * DELETE /api/customer/social-connections/:id
 * Soft disconnect from social_connections — nullifies tokens, marks disconnected.
 */
export async function disconnectSocialConnection(request, env, auth) {
  const id = request.params?.id;
  if (!id || !isValidUUID(id)) return error("Invalid connection ID", "INVALID_ID", null, 400);

  const db = getDB(env);

  const result = await db.prepare(`
    UPDATE social_connections
    SET
      status = 'disconnected',
      access_token = NULL,
      refresh_token = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND brand_id = ?
  `).bind(id, auth.brand_id).run();

  if (!result.meta.changes) return error("Connection not found or unauthorized", "NOT_FOUND", null, 404);

  return json({ success: true });
}

/**
 * POST /api/customer/social-connections/:id/refresh
 * On-demand token refresh for a single connection.
 */
export async function refreshConnectionOnDemand(request, env, auth) {
  const id = request.params?.id;
  if (!id || !isValidUUID(id)) return error("Invalid connection ID", "INVALID_ID", null, 400);

  const db = getDB(env);

  const connection = await db.prepare(`
    SELECT * FROM social_connections WHERE id = ? AND brand_id = ?
  `).bind(id, auth.brand_id).first();

  if (!connection) return error("Connection not found", "NOT_FOUND", null, 404);
  if (!connection.refresh_token) return error("No refresh token available — reconnect required", "NO_REFRESH_TOKEN", null, 400);

  const result = await refreshSocialConnection(db, connection, env);
  if (!result.success) return error("Token refresh failed", "REFRESH_FAILED", null, 502);

  return json({ success: true });
}
