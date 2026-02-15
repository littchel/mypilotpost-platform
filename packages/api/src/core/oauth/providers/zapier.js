import OAuthProvider from "../provider-interface.js";

export default class ZapierProvider extends OAuthProvider {
  authorize({ state, redirectUri }) {
    // Zapier handles OAuth internally via hooks
    return `${redirectUri}?state=${state}&provider=zapier`;
  }

  async exchangeCode() {
    return {
      access_token: "zapier_managed",
      scope: "social wordpress"
    };
  }

  normalizeAccount() {
    return {
      provider_account_id: "zapier",
      display_name: "Zapier Integration",
      scopes: "social wordpress"
    };
  }
}
