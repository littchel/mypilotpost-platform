import { json } from "../lib/json.js";

/* ======================================================
   STATE GENERATION
====================================================== */

function generateState() {
  return crypto.randomUUID();
}

/* ======================================================
   OAUTH START
====================================================== */

export async function oauthStart(request, env, providerConfig, brandId) {
  if (!brandId) {
    return json({ error: "Brand ID missing" }, 400);
  }

  const state = generateState();

  try {
    await env.mypilotpost.prepare(`
      INSERT INTO oauth_states (id, brand_id)
      VALUES (?, ?)
    `).bind(state, brandId).run();

    // State inserted successfully

  } catch (err) {
    console.error("STATE INSERT FAILED:", err);
    return json({ error: "State insert failed", details: err.message }, 500);
  }

  const redirectUri = `${env.BASE_URL}/api/customer/oauth/${providerConfig.name}/callback`;

  const authUrl = new URL(providerConfig.authUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", env[providerConfig.clientIdEnv]);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", providerConfig.scopes);
  authUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl.toString() }
  });
}

/* ======================================================
   OAUTH CALLBACK
====================================================== */

export async function oauthCallback(request, env, providerConfig) {
  try {

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state")?.trim();

    // Callback received state

    if (!code || !state) {
      return json({ error: "Invalid OAuth response" }, 400);
    }

    const stateRow = await env.mypilotpost.prepare(`
      SELECT brand_id FROM oauth_states WHERE id = ?
    `).bind(state).first();

    if (!stateRow) {
      console.error("STATE NOT FOUND:", state);
      return json({ error: "Invalid OAuth state" }, 400);
    }

    const brandId = stateRow.brand_id;

    await env.mypilotpost.prepare(`
      DELETE FROM oauth_states WHERE id = ?
    `).bind(state).run();

    const redirectUri = `${env.BASE_URL}/api/customer/oauth/${providerConfig.name}/callback`;

    const tokenRes = await fetch(providerConfig.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: env[providerConfig.clientIdEnv],
        client_secret: env[providerConfig.clientSecretEnv]
      })
    });

    let tokenData;

    try {
      tokenData = await tokenRes.json();
    } catch (err) {
      console.error("TOKEN PARSE FAILED:", err);
      return json({ error: "Token parse failed" }, 500);
    }

    if (!tokenData.access_token) {
      console.error("TOKEN EXCHANGE FAILED:", tokenData);
      return json({ error: "Token exchange failed", details: tokenData }, 400);
    }

    await env.mypilotpost.prepare(`
      INSERT INTO connected_accounts (
        id,
        brand_id,
        platform,
        external_account_id,
        access_token,
        refresh_token,
        expires_at,
        connected_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      crypto.randomUUID(),
      brandId,
      providerConfig.name,
      null,
      tokenData.access_token,
      tokenData.refresh_token || null,
      tokenData.expires_in
        ? Math.floor(Date.now() / 1000) + tokenData.expires_in
        : null
    ).run();

    return Response.redirect(
      `${env.BASE_URL}/dashboard?connected=${providerConfig.name}`
    );

  } catch (err) {
    console.error("OAUTH CALLBACK CRASH:", err);
    return json({ error: "OAuth callback crashed" }, 500);
  }
}