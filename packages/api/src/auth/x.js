import { oauthStart, oauthCallback } from "./oauth-engine.js";
import { xProvider } from "./providers/x.js";

export function xStart(request, env, auth) {
  return oauthStart(request, env, xProvider);
}

export function xCallback(request, env, auth) {
  return oauthCallback(request, env, xProvider, auth.brand_id);
}
