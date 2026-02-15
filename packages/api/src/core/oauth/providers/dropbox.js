import OAuthProvider from "../provider-interface.js";

export default class DropboxProvider extends OAuthProvider {
  authorize({ state, redirectUri, env }) {
    const params = new URLSearchParams({
      client_id: env.DROPBOX_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      token_access_type: "offline",
      state
    });

    return `https://www.dropbox.com/oauth2/authorize?${params}`;
  }

  async exchangeCode({ code, redirectUri, env }) {
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        client_id: env.DROPBOX_CLIENT_ID,
        client_secret: env.DROPBOX_CLIENT_SECRET
      })
    });

    return res.json();
  }

  normalizeAccount(token) {
    return {
      provider_account_id: null,
      display_name: "Dropbox",
      scopes: token.scope
    };
  }
}
