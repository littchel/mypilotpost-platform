import { oauthStart, oauthCallback } from "./universal";

export const canvaProvider = {
  name: "canva",
  authUrl: "https://www.canva.com/api/oauth/authorize",
  tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
  clientIdEnv: "CANVA_CLIENT_ID",
  clientSecretEnv: "CANVA_CLIENT_SECRET",
  scopes: "design:content:write asset:read profile:read asset:write design:permission:write design:content:read design:permission:read"
};

export async function canvaStart(request, env, auth) {
  return oauthStart(request, env, canvaProvider, auth.brand_id);
}

export async function canvaCallback(request, env) {
  return oauthCallback(request, env, canvaProvider);
}