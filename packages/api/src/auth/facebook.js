import { oauthStart, oauthCallback } from "./oauth-engine.js";
import { facebookProvider } from "./providers/facebook.js";

export function facebookStart(request, env, auth) {
  return oauthStart(request, env, facebookProvider);
}

export function facebookCallback(request, env, auth) {
  return oauthCallback(request, env, facebookProvider, auth.brand_id);
}
