import { oauthStart, oauthCallback } from "./oauth-engine.js";
import { youtubeProvider } from "./providers/youtube.js";

export function youtubeStart(request, env, auth) {
  return oauthStart(request, env, youtubeProvider);
}

export function youtubeCallback(request, env, auth) {
  return oauthCallback(request, env, youtubeProvider, auth.brand_id);
}
