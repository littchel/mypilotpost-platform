export default class OAuthProvider {
  authorize() {
    throw new Error("authorize() not implemented");
  }

  exchangeCode() {
    throw new Error("exchangeCode() not implemented");
  }

  refreshToken() {
    throw new Error("refreshToken() not implemented");
  }

  normalizeAccount() {
    throw new Error("normalizeAccount() not implemented");
  }
}
