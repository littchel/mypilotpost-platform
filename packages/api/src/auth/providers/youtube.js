export const youtubeProvider = {
  name: "youtube",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes:
    "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
  clientIdEnv: "YOUTUBE_CLIENT_ID",
  clientSecretEnv: "YOUTUBE_CLIENT_SECRET"
};
