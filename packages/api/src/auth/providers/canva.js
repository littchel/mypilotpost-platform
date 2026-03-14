export const canvaProvider = {
  name: "canva",
  authUrl: "https://www.canva.com/api/oauth/authorize",
  tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
  scopes:
    "design:content:read design:content:write asset:read asset:write profile:read",
  clientIdEnv: "CANVA_CLIENT_ID",
  clientSecretEnv: "CANVA_CLIENT_SECRET"
};
