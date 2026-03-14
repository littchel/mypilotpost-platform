export const pinterestProvider = {
  name: "pinterest",
  authUrl: "https://www.pinterest.com/oauth/",
  tokenUrl: "https://api.pinterest.com/v5/oauth/token",
  scopes: "pins:read pins:write boards:read boards:write user_accounts:read",
  clientIdEnv: "PINTEREST_APP_ID",
  clientSecretEnv: "PINTEREST_APP_SECRET"
};
