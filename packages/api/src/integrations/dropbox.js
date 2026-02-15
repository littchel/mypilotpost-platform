import { json } from "../lib/json.js";
import { getDB } from "../lib/db.js";

/**
 * Dropbox — Integration OAuth
 * Purpose: Read-only access to files/assets
 * No uploads, no publishing
 */

/* ============================
   START OAUTH
============================ */
export async function dropboxIntegrationStart(request, env, auth) {
  const state = btoa(
    JSON.stringify({
      mode: "integration",
      platform: "dropbox",
      brand_id: auth.brand_id
    })
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.DROPBOX_CLIENT_ID,
    redirect_uri: `${env.PUBLIC_API_BASE}/api/customer/integrations/dropbox/callback`,
    token_access_type: "offline",
    scope: "files.metadata.read files.content.read",
    state
  });

  const url = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
  return Response.redirect(url, 302);
}

/* ============================
   CALLBACK
============================ */
export async function dropboxIntegrationCallback(request, env, auth) {
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

  const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        btoa(`${env.DROPBOX_CLIENT_ID}:${env.DROPBOX_CLIENT_SECRET}`)
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: `${env.PUBLIC_API_BASE}/api/customer/integrations/dropbox/callback`
    })
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    return json({ error: "Token exchange failed" }, 400);
  }

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
      "dropbox",
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
