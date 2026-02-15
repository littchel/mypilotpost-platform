import { json } from "../lib/json.js";
import { getDB } from "../lib/db.js";

/**
 * Canva — Integration OAuth
 * Purpose: Connect Canva account to a brand (assets / designs)
 * Scope: READ / ASSETS (no publishing)
 */

/* ============================
   START OAUTH
============================ */
export async function canvaIntegrationStart(request, env, auth) {
  const state = btoa(
    JSON.stringify({
      mode: "integration",
      platform: "canva",
      brand_id: auth.brand_id
    })
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.CANVA_CLIENT_ID,
    redirect_uri: `${env.PUBLIC_API_BASE}/api/customer/integrations/canva/callback`,
    scope: "design:read asset:read",
    state
  });

  const url = `https://www.canva.com/oauth/authorize?${params.toString()}`;
  return Response.redirect(url, 302);
}

/* ============================
   CALLBACK
============================ */
export async function canvaIntegrationCallback(request, env, auth) {
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
  const tokenRes = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.CANVA_CLIENT_ID,
      client_secret: env.CANVA_CLIENT_SECRET,
      code,
      redirect_uri: `${env.PUBLIC_API_BASE}/api/customer/integrations/canva/callback`
    })
  });

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
      "canva",
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      JSON.stringify(["assets_read"])
    )
    .run();

  return json({ success: true });
}
