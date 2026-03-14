import { oauthStart, oauthCallback } from "./oauth-engine.js";
import { pinterestProvider } from "./providers/pinterest.js";

export function pinterestStart(request, env, auth) {
  return oauthStart(request, env, pinterestProvider);
}

export function pinterestCallback(request, env, auth) {
  return oauthCallback(request, env, pinterestProvider, auth.brand_id);
}
