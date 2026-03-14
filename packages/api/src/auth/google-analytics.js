import { oauthStart, oauthCallback } from "./oauth-engine.js";
import { googleAnalyticsProvider } from "./providers/google-analytics.js";

export function googleAnalyticsStart(request, env, auth) {
  return oauthStart(request, env, googleAnalyticsProvider);
}

export function googleAnalyticsCallback(request, env, auth) {
  return oauthCallback(request, env, googleAnalyticsProvider, auth.brand_id);
}
