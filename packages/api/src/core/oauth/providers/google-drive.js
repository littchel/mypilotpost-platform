import OAuthProvider from "../provider-interface.js";

export default class GoogleDriveProvider extends OAuthProvider {
  authorize({ state, redirectUri, env }) {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      scope: "https://www.googleapis.com/auth/drive.readonly",
      state,
      prompt: "consent"
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode({ code, redirectUri, env }) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET
      })
    });

    return res.json();
  }

  normalizeAccount(token) {
    return {
      provider_account_id: token.sub ?? null,
      display_name: "Google Drive",
      scopes: token.scope
    };
  }
}
