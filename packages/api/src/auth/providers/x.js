export const xProvider = {
  name: "x",
  authUrl: "https://twitter.com/i/oauth2/authorize",
  tokenUrl: "https://api.twitter.com/2/oauth2/token",
  scopes: "tweet.read tweet.write users.read offline.access",
  clientIdEnv: "X_CLIENT_ID",
  clientSecretEnv: "X_CLIENT_SECRET"
};
