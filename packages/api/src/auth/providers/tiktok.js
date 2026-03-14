/**
 * TikTok OAuth Provider
 * Canon Compliant
 *
 * - Brand scoped
 * - Stores tokens in connected_accounts
 * - No platform logic here
 */

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

export async function tiktokStart(request, env, auth) {
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_ID,
    scope: "user.info.basic,video.upload,video.publish,video.list",
    response_type: "code",
    redirect_uri: `${env.API_BASE_URL}/api/customer/oauth/tiktok/callback`,
    state
  });

  return Response.redirect(`${AUTH_URL}?${params.toString()}`, 302);
}

export async function tiktokCallback(request, env, auth) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return json({ error: "Missing authorization code" }, 400);
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_ID,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${env.API_BASE_URL}/api/customer/oauth/tiktok/callback`
    })
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    return json({ error: tokenData }, 400);
  }

  const db = getDB(env);

  await db.prepare(`
    INSERT INTO connected_accounts (
      id,
      brand_id,
      platform,
      external_account_id,
      access_token,
      refresh_token,
      connected_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    crypto.randomUUID(),
    auth.brand_id,
    "tiktok",
    tokenData.open_id,
    tokenData.access_token,
    tokenData.refresh_token
  ).run();

  return Response.redirect(`${env.APP_BASE_URL}/settings/integrations`);
}