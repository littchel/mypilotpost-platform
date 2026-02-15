import { json } from "../lib/json.js";
import { getDB } from "../lib/db.js";

/**
 * Bing Webmaster Tools — Integration OAuth
 * Read-only analytics access
 */

/* ============================
   START OAUTH
============================ */
export async function bingIntegrationStart(request, env, auth) {
  const state = btoa(
    JSON.stringify({
      mode: "integration",
      platform: "bing_webmaster",
      brand_id: auth.brand_id
    })
  );

  const params = new URLSearchParams({
    client_id: env.BING_CLIENT_ID,
    response_type: "code",
    redirect_uri: `${env.PUBLIC_API_BASE}/api/customer/integrations/bing/callback`,
    response_mode: "query",
    scope: "https://www.bingapis.com/webmasters",
    state
  });

  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  return Response.redirect(url, 302);
}

/* ============================
   CALLBACK
============================ */
export async function bingIntegrationCallback(request, env, auth) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  if (!code || !stateParam) {
    return json({ error: "Missing OAuth parameters" }, 400);
  }

  const state = JSON.parse(atob(stateParam));
  if (state.mode !== "integration") {
    return json({ error: "Invalid OAuth state" }, 400);
  }

  // Exchange code for tokens
  const tokenRes = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.BING_CLIENT_ID,
        client_secret: env.BING_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${env.PUBLIC_API_BASE}/api/customer/integrations/bing/callback`,
        scope: "https://www.bingapis.com/webmasters"
      })
    }
  );

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    return json({ error: "Token exchange failed" }, 400);
  }

  // Persist integration
  const db = getDB(env);
  await db
    .prepare(`
      INSERT INTO connected_accounts (
        id,
        brand_id,
        platform,
        access_token,
        refresh_token,
        token_expires_at,
        capabilities,
        status,
        connected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'connected', CURRENT_TIMESTAMP)
    `)
    .bind(
      crypto.randomUUID(),
      state.brand_id,
      "bing_webmaster",
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      JSON.stringify(["seo_read"])
    )
    .run();

  return json({ success: true });
}
