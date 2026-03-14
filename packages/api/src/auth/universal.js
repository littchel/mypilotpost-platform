// packages/api/src/auth/universal.js

export async function oauthStart(request, env, provider, brandId) {
  const state = crypto.randomUUID();

  // -----------------------
  // PKCE GENERATION
  // -----------------------

  // Create random verifier
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  const code_verifier = base64UrlEncode(randomBytes);

  // SHA256 challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(code_verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const code_challenge = base64UrlEncode(new Uint8Array(digest));

  // Store state + verifier
  await env.mypilotpost.prepare(`
    INSERT INTO oauth_states (id, brand_id, code_verifier)
    VALUES (?, ?, ?)
  `).bind(state, brandId, code_verifier).run();

  const redirectUri =
    `${env.BASE_URL}/api/customer/oauth/${provider.name}/callback`;

  const authUrl = new URL(provider.authUrl);
  authUrl.searchParams.set("response_type", "code");
  
  // TikTok uses client_key instead of client_id
  if (provider.name === "tiktok") {
    authUrl.searchParams.set("client_key", env[provider.clientIdEnv]);
  } else {
    authUrl.searchParams.set("client_id", env[provider.clientIdEnv]);
  }
  
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", provider.scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", code_challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl.toString() }
  });
}

export async function oauthCallback(request, env, provider) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state)
    return new Response(
      JSON.stringify({ error: "Invalid OAuth response" }),
      { status: 400 }
    );

  const stateRow = await env.mypilotpost.prepare(`
    SELECT brand_id, code_verifier
    FROM oauth_states
    WHERE id = ?
  `).bind(state).first();

  if (!stateRow)
    return new Response(
      JSON.stringify({ error: "Invalid OAuth state" }),
      { status: 400 }
    );

  await env.mypilotpost.prepare(`
    DELETE FROM oauth_states WHERE id = ?
  `).bind(state).run();

  const redirectUri =
    `${env.BASE_URL}/api/customer/oauth/${provider.name}/callback`;

  // Build token request body with TikTok-specific parameter if needed
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    ...(provider.name === "tiktok"
      ? { client_key: env[provider.clientIdEnv] }
      : { client_id: env[provider.clientIdEnv] }),
    client_secret: env[provider.clientSecretEnv],
    code_verifier: stateRow.code_verifier
  });

  const tokenRes = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token)
    return new Response(JSON.stringify(tokenData), { status: 400 });

  await env.mypilotpost.prepare(`
    INSERT INTO connected_accounts
    (id, brand_id, platform, access_token, refresh_token, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    stateRow.brand_id,
    provider.name,
    tokenData.access_token,
    tokenData.refresh_token || null,
    tokenData.expires_in
      ? Math.floor(Date.now() / 1000) + tokenData.expires_in
      : null
  ).run();

  return Response.redirect(
    `https://www.mypilotpost.com/dashboard?connected=${provider.name}`
  );
}

// -----------------------
// Helper
// -----------------------

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}