import { json } from "../lib/json.js";
import { getDB } from "../lib/db.js";

/**
 * Google Media Integration
 * Platforms: Google Drive, YouTube (READ-ONLY)
 * No posting, no uploads, no scheduling
 */

/* ============================
   START OAUTH
============================ */
export async function googleMediaIntegrationStart(request, env, auth) {
  const state = btoa(
    JSON.stringify({
      mode: "integration",
      platform: "google_media",
      brand_id: auth.brand_id
    })
  );

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.PUBLIC_API_BASE}/api/customer/integrations/google-media/callback`,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/youtube.readonly"
    ].join(" "),
    state
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(url, 302);
}

/* ============================
   CALLBACK
============================ */
export async function googleMediaIntegrationCallback(request, env, auth) {
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

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${env.PUBLIC_API_BASE}/api/customer/integrations/google-media/callback`
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
      "google_media",
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      JSON.stringify(["assets_read", "video_read"])
    )
    .run();

  return json({ success: true });
}
