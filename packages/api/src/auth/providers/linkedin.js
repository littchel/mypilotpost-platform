// auth/providers/linkedin.js
export const linkedinProvider = {
  name: "linkedin",
  authUrl: "https://www.linkedin.com/oauth/v2/authorization",
  tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  clientIdEnv: "LINKEDIN_CLIENT_ID",
  clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  scopes: "openid profile email w_member_social"
};