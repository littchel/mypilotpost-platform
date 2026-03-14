import { oauthStart, oauthCallback } from "./oauth-engine.js";
import { linkedinProvider } from "./providers/linkedin.js";

export function linkedinStart(request, env, auth) {
  // auth REQUIRED here
  return oauthStart(request, env, linkedinProvider, auth.brand_id);
}

export async function linkedinCallback(request, env) {
  // DO NOT require auth here
  return oauthCallback(request, env, linkedinProvider);
}