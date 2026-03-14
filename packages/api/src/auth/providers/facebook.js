export const facebookProvider = {
  name: "facebook",
  authUrl: "https://www.facebook.com/v24.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v24.0/oauth/access_token",
  scopes: "pages_manage_posts,pages_read_engagement",
  clientIdEnv: "FACEBOOK_APP_ID",
  clientSecretEnv: "FACEBOOK_APP_SECRET"
};
