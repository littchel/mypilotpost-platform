import OAuthProvider from "../provider-interface.js";

export default class CanvaProvider extends OAuthProvider {
  authorize({ state, redirectUri, env }) {
    const params = new URLSearchParams({
      client_id: env.CANVA_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "design:read",
      state
    });

    return `https://www.canva.com/oauth/authorize?${params}`;
  }

  async exchangeCode({ code, redirectUri, env }) {
    const res = await fetch("https://api.canva.com/rest/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: env.CANVA_CLIENT_ID,
        client_secret: env.CANVA_CLIENT_SECRET
      })
    });

    return res.json();
  }

  normalizeAccount(token) {
    return {
      provider_account_id: token.user_id ?? null,
      display_name: "Canva Account",
      scopes: token.scope
    };
  }
}
