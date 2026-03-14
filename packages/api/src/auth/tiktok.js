import { oauthStart, oauthCallback } from "./universal";

export const tiktokProvider = {
  name: "tiktok",
  authUrl: "https://www.tiktok.com/v2/auth/authorize/",
  tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
  clientIdEnv: "TIKTOK_CLIENT_KEY",
  clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  scopes: "user.info.basic video.list video.upload video.publish"
};

export async function tiktokStart(request, env, auth) {
  if (!env) {
    console.error("tiktokStart: env is undefined");
    return new Response(
      JSON.stringify({ error: "Configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!auth || !auth.brand_id) {
    console.error("tiktokStart: auth or brand_id is missing");
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return oauthStart(request, env, tiktokProvider, auth.brand_id);
}

export async function tiktokCallback(request, env) {
  if (!env) {
    console.error("tiktokCallback: env is undefined");
    return new Response(
      JSON.stringify({ error: "Configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return oauthCallback(request, env, tiktokProvider);
}