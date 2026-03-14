export const googleAnalyticsProvider = {
  name: "google-analytics",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes:
    "https://www.googleapis.com/auth/analytics.readonly",
  clientIdEnv: "GA_CLIENT_ID",
  clientSecretEnv: "GA_CLIENT_SECRET"
};
