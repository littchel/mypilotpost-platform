/**
 * OAUTH-002: Provider Scopes & Granular Token Refresh Lifecycle
 * Comprehensive regression test suite.
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { PROVIDERS, getProvider } from "../../integrations/registry.js";
import { refreshSocialConnection, ensureValidConnection } from "../../integrations/refresh_manager.js";
import { encrypt, decrypt } from "../../lib/crypto.js";

const TEST_SECRET = "test-encryption-secret-32byteslong!";

/**
 * In-memory Mock D1 Database simulating SQLite semantics
 */
class MockD1 {
  constructor() {
    this.connections = new Map();
  }

  seedConnection(conn) {
    this.connections.set(conn.id, { ...conn });
  }

  getConnection(id) {
    const c = this.connections.get(id);
    return c ? { ...c } : null;
  }

  prepare(query) {
    const db = this;
    const normalized = query.trim().replace(/\s+/g, " ");

    return {
      bind(...args) {
        return {
          async first() {
            if (normalized.includes("SELECT * FROM social_connections WHERE id = ?")) {
              const id = args[0];
              const conn = db.connections.get(id);
              return conn ? { ...conn } : null;
            }
            return null;
          },
          async all() {
            if (normalized.includes("SELECT * FROM social_connections")) {
              return { results: Array.from(db.connections.values()).map(c => ({ ...c })) };
            }
            return { results: [] };
          },
          async run() {
            // Concurrency lease update
            if (normalized.includes("SET last_refreshed_at = CURRENT_TIMESTAMP") && normalized.includes("last_refreshed_at < DATETIME")) {
              const id = args[0];
              const conn = db.connections.get(id);
              if (!conn) return { changes: 0, meta: { changes: 0 } };

              const now = Date.now();
              const lastRefreshed = conn.last_refreshed_at ? new Date(conn.last_refreshed_at).getTime() : 0;
              // 30 seconds lease window
              if (conn.last_refreshed_at && (now - lastRefreshed < 30000)) {
                return { changes: 0, meta: { changes: 0 } };
              }

              conn.last_refreshed_at = new Date(now).toISOString();
              conn.updated_at = new Date(now).toISOString();
              return { changes: 1, meta: { changes: 1 } };
            }

            // Concurrency lease release on failure
            if (normalized.includes("SET last_refreshed_at = ?") && normalized.includes("WHERE id = ?")) {
              const [last_refreshed_at, id] = args;
              const conn = db.connections.get(id);
              if (conn) {
                conn.last_refreshed_at = last_refreshed_at;
                conn.updated_at = new Date().toISOString();
                return { changes: 1, meta: { changes: 1 } };
              }
              return { changes: 0, meta: { changes: 0 } };
            }

            // Status update: status = 'revoked'
            if (normalized.includes("SET status = 'revoked'")) {
              const id = args[0];
              const conn = db.connections.get(id);
              if (conn) {
                conn.status = 'revoked';
                conn.updated_at = new Date().toISOString();
                return { changes: 1, meta: { changes: 1 } };
              }
              return { changes: 0, meta: { changes: 0 } };
            }

            // Status update: status = 'error'
            if (normalized.includes("SET status = 'error'")) {
              const id = args[0];
              const conn = db.connections.get(id);
              if (conn) {
                conn.status = 'error';
                conn.updated_at = new Date().toISOString();
                return { changes: 1, meta: { changes: 1 } };
              }
              return { changes: 0, meta: { changes: 0 } };
            }

            // Status update parameterized: SET status = ?
            if (normalized.includes("UPDATE social_connections SET status = ?")) {
              const [status, id] = args;
              const conn = db.connections.get(id);
              if (conn) {
                conn.status = status;
                conn.updated_at = new Date().toISOString();
                return { changes: 1, meta: { changes: 1 } };
              }
              return { changes: 0, meta: { changes: 0 } };
            }

            // Full token refresh update
            if (normalized.includes("access_token = ?") && normalized.includes("refresh_token = ?")) {
              const [access_token, refresh_token, expires_at, status, id] = args;
              const conn = db.connections.get(id);
              if (conn) {
                conn.access_token = access_token;
                conn.refresh_token = refresh_token;
                conn.expires_at = expires_at;
                conn.status = status;
                conn.last_refreshed_at = new Date().toISOString();
                conn.updated_at = new Date().toISOString();
                return { changes: 1, meta: { changes: 1 } };
              }
              return { changes: 0, meta: { changes: 0 } };
            }

            // Threads refresh update
            if (normalized.includes("access_token = ?") && normalized.includes("status = 'active'")) {
              const [access_token, expires_at, id] = args;
              const conn = db.connections.get(id);
              if (conn) {
                conn.access_token = access_token;
                conn.expires_at = expires_at;
                conn.status = "active";
                conn.last_refreshed_at = new Date().toISOString();
                conn.updated_at = new Date().toISOString();
                return { changes: 1, meta: { changes: 1 } };
              }
              return { changes: 0, meta: { changes: 0 } };
            }

            return { changes: 0, meta: { changes: 0 } };
          }
        };
      }
    };
  }
}

function createTestEnv(overrides = {}) {
  return {
    ENCRYPTION_SECRET: TEST_SECRET,
    GOOGLE_CLIENT_ID: "google-test-id",
    GOOGLE_CLIENT_SECRET: "google-test-secret",
    META_CLIENT_ID: "meta-test-id",
    META_CLIENT_SECRET: "meta-test-secret",
    LINKEDIN_CLIENT_ID: "linkedin-test-id",
    LINKEDIN_CLIENT_SECRET: "linkedin-test-secret",
    X_CLIENT_ID: "x-test-id",
    X_CLIENT_SECRET: "x-test-secret",
    TIKTOK_CLIENT_KEY: "tiktok-test-key",
    TIKTOK_CLIENT_SECRET: "tiktok-test-secret",
    PINTEREST_APP_ID: "pinterest-test-id",
    PINTEREST_APP_SECRET: "pinterest-test-secret",
    CANVA_CLIENT_ID: "canva-test-id",
    CANVA_CLIENT_SECRET: "canva-test-secret",
    THREADS_CLIENT_ID: "threads-test-id",
    THREADS_CLIENT_SECRET: "threads-test-secret",
    ...overrides
  };
}

describe("OAUTH-002: Provider Scopes & Token Refresh Lifecycle", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /* ─────────────────────────────────────────────────────────────
     OAUTH-002A: Provider Scope Audit & Isolation
  ───────────────────────────────────────────────────────────── */

  test("1. LinkedIn Personal scopes include openid profile email and w_member_social", () => {
    const provider = getProvider("linkedin_personal");
    assert.ok(provider, "linkedin_personal provider must exist");
    assert.strictEqual(provider.credential_key, "LINKEDIN");
    assert.match(provider.scopes, /\bopenid\b/);
    assert.match(provider.scopes, /\bprofile\b/);
    assert.match(provider.scopes, /\bemail\b/);
    assert.match(provider.scopes, /\bw_member_social\b/);
  });

  test("2. LinkedIn Pages scopes include organization permissions with LINKEDIN credential key", () => {
    const provider = getProvider("linkedin_pages");
    assert.ok(provider, "linkedin_pages provider must exist");
    assert.strictEqual(provider.credential_key, "LINKEDIN");
    assert.match(provider.scopes, /\bw_organization_social\b/);
    assert.match(provider.scopes, /\brw_organization_admin\b/);
  });

  test("3. Facebook and Instagram scopes are strictly isolated without cross-contamination", () => {
    const fb = getProvider("facebook");
    const ig = getProvider("instagram");

    assert.ok(fb && ig);
    assert.strictEqual(fb.scopes.includes("instagram_"), false, "Facebook flow must not contain instagram_* scopes");
    assert.strictEqual(ig.scopes.includes("pages_manage_posts"), false, "Instagram flow must not contain Facebook post management scopes");
    assert.match(ig.scopes, /instagram_content_publish/);
  });

  test("4. Google sub-providers maintain least-privilege scope separation", () => {
    const gDrive = getProvider("google_drive");
    const gAnalytics = getProvider("google_analytics");
    const gSearch = getProvider("google_search_console");
    const youtube = getProvider("youtube");

    assert.match(gDrive.scopes, /drive\.readonly/, "Google Drive must use readonly scope");
    assert.match(gAnalytics.scopes, /analytics\.readonly/, "Google Analytics must use readonly scope");
    assert.match(gSearch.scopes, /webmasters\.readonly/, "Google Search Console must use readonly scope");
    assert.match(youtube.scopes, /youtube\.upload/, "YouTube must request upload capability");
  });

  test("5. TikTok specifies client_key parameter and media upload scopes", () => {
    const tiktok = getProvider("tiktok");
    assert.strictEqual(tiktok.client_id_param, "client_key");
    assert.match(tiktok.scopes, /video\.publish/);
    assert.match(tiktok.scopes, /video\.upload/);
  });

  test("6. X and Dropbox require offline access scopes/parameters", () => {
    const x = getProvider("x");
    const dropbox = getProvider("dropbox");
    assert.match(x.scopes, /offline\.access/, "X must request offline.access for refresh token");
    assert.strictEqual(dropbox.auth_params?.token_access_type, "offline", "Dropbox must request offline token access type");
  });

  /* ─────────────────────────────────────────────────────────────
     OAUTH-002B: Token Refresh Lifecycle
  ───────────────────────────────────────────────────────────── */

  test("7. Successful token refresh updates encrypted access_token and ISO expiry", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const oldAccessEnc = await encrypt("old-access-token", TEST_SECRET);
    const oldRefreshEnc = await encrypt("valid-refresh-token", TEST_SECRET);

    db.seedConnection({
      id: "conn-google-1",
      brand_id: "brand-1",
      platform: "google",
      account_id: "acc-1",
      access_token: oldAccessEnc,
      refresh_token: oldRefreshEnc,
      expires_at: new Date(Date.now() - 1000).toISOString(),
      status: "active"
    });

    globalThis.fetch = async (url, opts) => {
      assert.strictEqual(url, "https://oauth2.googleapis.com/token");
      assert.strictEqual(opts.method, "POST");
      const body = Object.fromEntries(new URLSearchParams(opts.body));
      assert.strictEqual(body.grant_type, "refresh_token");
      assert.strictEqual(body.refresh_token, "valid-refresh-token");
      assert.strictEqual(body.client_id, "google-test-id");
      assert.strictEqual(body.client_secret, "google-test-secret");

      return new Response(JSON.stringify({
        access_token: "new-google-access-token",
        expires_in: 3600
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-google-1"), env);
    assert.strictEqual(res.success, true);

    const updated = db.getConnection("conn-google-1");
    const decryptedAccess = await decrypt(updated.access_token, TEST_SECRET);
    assert.strictEqual(decryptedAccess, "new-google-access-token");
    assert.strictEqual(updated.status, "active");
    assert.ok(new Date(updated.expires_at).getTime() > Date.now());
  });

  test("8. Refresh-token rotation: overwrites refresh token when provider issues a new one", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const oldAccessEnc = await encrypt("old-access", TEST_SECRET);
    const oldRefreshEnc = await encrypt("old-refresh", TEST_SECRET);

    db.seedConnection({
      id: "conn-rot-1",
      platform: "google",
      access_token: oldAccessEnc,
      refresh_token: oldRefreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        access_token: "new-access",
        refresh_token: "rotated-new-refresh",
        expires_in: 3600
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-rot-1"), env);
    assert.strictEqual(res.success, true);

    const updated = db.getConnection("conn-rot-1");
    const decryptedRefresh = await decrypt(updated.refresh_token, TEST_SECRET);
    assert.strictEqual(decryptedRefresh, "rotated-new-refresh");
  });

  test("9. Non-rotating refresh preserves existing valid stored refresh token", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const oldAccessEnc = await encrypt("old-access", TEST_SECRET);
    const oldRefreshEnc = await encrypt("persistent-refresh", TEST_SECRET);

    db.seedConnection({
      id: "conn-norot-1",
      platform: "google",
      access_token: oldAccessEnc,
      refresh_token: oldRefreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        access_token: "new-access-only",
        expires_in: 3600
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-norot-1"), env);
    assert.strictEqual(res.success, true);

    const updated = db.getConnection("conn-norot-1");
    const decryptedRefresh = await decrypt(updated.refresh_token, TEST_SECRET);
    assert.strictEqual(decryptedRefresh, "persistent-refresh", "Must not erase existing refresh token when provider omits it");
  });

  test("10. Canva, X, and Pinterest use HTTP Basic auth headers during token refresh", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const platforms = ["x", "pinterest", "canva"];

    for (const p of platforms) {
      const accessEnc = await encrypt("acc", TEST_SECRET);
      const refreshEnc = await encrypt("ref", TEST_SECRET);
      db.seedConnection({
        id: `conn-basic-${p}`,
        platform: p,
        access_token: accessEnc,
        refresh_token: refreshEnc,
        status: "active"
      });

      let authHeaderSeen = null;
      globalThis.fetch = async (url, opts) => {
        authHeaderSeen = opts.headers["Authorization"];
        const body = Object.fromEntries(new URLSearchParams(opts.body));
        assert.strictEqual(body.client_id, undefined, `${p} credentials must not appear in body`);
        assert.strictEqual(body.client_secret, undefined, `${p} credentials must not appear in body`);
        return new Response(JSON.stringify({ access_token: `new-${p}`, expires_in: 3600 }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      };

      const res = await refreshSocialConnection(db, db.getConnection(`conn-basic-${p}`), env);
      assert.strictEqual(res.success, true);
      assert.match(authHeaderSeen, /^Basic /, `${p} must send Basic Auth header`);
    }
  });

  test("11. TikTok uses client_key parameter in POST body during token refresh", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("ref", TEST_SECRET);
    db.seedConnection({
      id: "conn-tiktok-1",
      platform: "tiktok",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      status: "active"
    });

    let clientKeySeen = null;
    let clientIdSeen = null;
    globalThis.fetch = async (url, opts) => {
      const body = Object.fromEntries(new URLSearchParams(opts.body));
      clientKeySeen = body.client_key;
      clientIdSeen = body.client_id;
      return new Response(JSON.stringify({ access_token: "new-tt", expires_in: 3600 }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-tiktok-1"), env);
    assert.strictEqual(res.success, true);
    assert.strictEqual(clientKeySeen, "tiktok-test-key", "Must send client_key");
    assert.strictEqual(clientIdSeen, undefined, "Must not send client_id");
  });

  test("12. Threads long-lived access token is refreshed via th_refresh_token grant", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("old-threads-access-token", TEST_SECRET);
    db.seedConnection({
      id: "conn-threads-1",
      platform: "threads",
      access_token: accessEnc,
      status: "active"
    });

    let requestedUrl = null;
    globalThis.fetch = async (url, opts) => {
      requestedUrl = url;
      assert.strictEqual(opts.method, "GET");
      return new Response(JSON.stringify({
        access_token: "refreshed-threads-access-token",
        expires_in: 5184000
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-threads-1"), env);
    assert.strictEqual(res.success, true);
    assert.match(requestedUrl, /graph\.threads\.net\/refresh_access_token/);
    assert.match(requestedUrl, /grant_type=th_refresh_token/);
    assert.match(requestedUrl, /access_token=old-threads-access-token/);

    const updated = db.getConnection("conn-threads-1");
    const decrypted = await decrypt(updated.access_token, TEST_SECRET);
    assert.strictEqual(decrypted, "refreshed-threads-access-token");
  });

  test("13. Permanent auth failure (invalid_grant) transitions connection to 'revoked'", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("revoked-ref", TEST_SECRET);
    db.seedConnection({
      id: "conn-rev-1",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        error: "invalid_grant",
        error_description: "Token has been expired or revoked."
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-rev-1"), env);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, "revoked");

    const updated = db.getConnection("conn-rev-1");
    assert.strictEqual(updated.status, "revoked", "Connection must be marked revoked on invalid_grant");
  });

  test("14. Rate limit (HTTP 429) does NOT mark connection as 'error' or 'revoked'", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("ref", TEST_SECRET);
    db.seedConnection({
      id: "conn-rate-1",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: "rate_limit_exceeded" }), {
        status: 429, headers: { "Content-Type": "application/json" }
      });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-rate-1"), env);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, "rate_limited");

    const updated = db.getConnection("conn-rate-1");
    assert.strictEqual(updated.status, "active", "Connection status must remain active on rate limit");
  });

  test("15. Transient provider outage (HTTP 503) does NOT mark connection as 'error' or 'revoked'", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("ref", TEST_SECRET);
    db.seedConnection({
      id: "conn-503-1",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response("Service Unavailable", { status: 503 });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-503-1"), env);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, "transient_outage");

    const updated = db.getConnection("conn-503-1");
    assert.strictEqual(updated.status, "active", "Connection status must remain active during transient outage");
  });

  test("16. Network exception (fetch error) does NOT mark connection as 'error'", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("ref", TEST_SECRET);
    db.seedConnection({
      id: "conn-net-1",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      throw new Error("DNS resolution failure");
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-net-1"), env);
    assert.strictEqual(res.success, false);
    assert.match(res.error, /DNS resolution failure/);

    const updated = db.getConnection("conn-net-1");
    assert.strictEqual(updated.status, "active", "Connection must remain active after transient network failure");
  });

  test("17. Malformed 200 response with missing access_token does not corrupt credentials", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("original-valid-access", TEST_SECRET);
    const refreshEnc = await encrypt("ref", TEST_SECRET);
    db.seedConnection({
      id: "conn-mal-1",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ not_an_access_token: 123 }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-mal-1"), env);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, "malformed_response");

    const updated = db.getConnection("conn-mal-1");
    const decrypted = await decrypt(updated.access_token, TEST_SECRET);
    assert.strictEqual(decrypted, "original-valid-access", "Original access token must remain uncorrupted");
  });

  test("18. Atomic lease prevents concurrent refresh race conditions", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("rot-ref", TEST_SECRET);
    db.seedConnection({
      id: "conn-lease-1",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      last_refreshed_at: null,
      status: "active"
    });

    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return new Response(JSON.stringify({ access_token: "new", refresh_token: "rotated", expires_in: 3600 }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    };

    // First refresh wins the lease
    const res1 = await refreshSocialConnection(db, db.getConnection("conn-lease-1"), env);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fetchCount, 1);

    // Second immediate refresh detects recent refresh and skips duplicate HTTP request
    const res2 = await refreshSocialConnection(db, db.getConnection("conn-lease-1"), env);
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.status, "already_refreshed");
    assert.strictEqual(fetchCount, 1, "Must not fire duplicate fetch to provider while lease is held");
  });

  test("19. Connections without refresh_token (Meta Pages) skip gracefully without error", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("meta-page-token", TEST_SECRET);
    db.seedConnection({
      id: "conn-meta-page",
      platform: "facebook",
      access_token: accessEnc,
      refresh_token: null,
      status: "active"
    });

    const res = await refreshSocialConnection(db, db.getConnection("conn-meta-page"), env);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, "no_refresh_token");

    const conn = db.getConnection("conn-meta-page");
    assert.strictEqual(conn.status, "active", "Status must remain active");
  });

  test("20. ensureValidConnection refreshes only when approaching expiry (< 5 min)", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("ref", TEST_SECRET);

    // Connection A: expires in 2 minutes (< 5 min) -> should refresh
    db.seedConnection({
      id: "conn-expiring-soon",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      expires_at: new Date(Date.now() + 120000).toISOString(),
      status: "active"
    });

    // Connection B: expires in 60 minutes (> 5 min) -> should not refresh
    db.seedConnection({
      id: "conn-fresh",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      status: "active"
    });

    let refreshedId = null;
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ access_token: "new-access", expires_in: 3600 }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    };

    await ensureValidConnection(db, db.getConnection("conn-fresh"), env);
    assert.strictEqual(db.getConnection("conn-fresh").expires_at, new Date(Date.now() + 3600000).toISOString());

    const resultSoon = await ensureValidConnection(db, db.getConnection("conn-expiring-soon"), env);
    assert.ok(new Date(resultSoon.expires_at).getTime() > Date.now() + 3000000, "Should have been refreshed to 1 hour");
  });

  test("21. unauthorized_client does NOT revoke user connection (preserves active status)", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc-unauth", TEST_SECRET);
    const refreshEnc = await encrypt("ref-unauth", TEST_SECRET);
    db.seedConnection({
      id: "conn-unauth-1",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        error: "unauthorized_client",
        error_description: "The client application is not authorized to use this grant type."
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-unauth-1"), env);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, "unauthorized_client");

    const updated = db.getConnection("conn-unauth-1");
    assert.strictEqual(updated.status, "active", "Connection status must remain active; client error is not user token revocation");
  });

  test("22. invalid_client does NOT revoke user connection (preserves active status)", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc-inv-cli", TEST_SECRET);
    const refreshEnc = await encrypt("ref-inv-cli", TEST_SECRET);
    db.seedConnection({
      id: "conn-inv-cli-1",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        error: "invalid_client",
        error_description: "Client authentication failed (invalid secret)."
      }), { status: 401, headers: { "Content-Type": "application/json" } });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-inv-cli-1"), env);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, "invalid_client");

    const updated = db.getConnection("conn-inv-cli-1");
    assert.strictEqual(updated.status, "active", "Connection status must remain active; invalid_client is an app credential issue");
  });

  test("23. Threads token refresh error with code 190 transitions connection to 'revoked'", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("threads-expired-token", TEST_SECRET);
    db.seedConnection({
      id: "conn-threads-190",
      platform: "threads",
      access_token: accessEnc,
      refresh_token: null,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        error: {
          message: "Error validating access token: Session has expired on Monday, 10-Oct-26.",
          type: "OAuthException",
          code: 190,
          error_subcode: 463
        }
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-threads-190"), env);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, "revoked");

    const updated = db.getConnection("conn-threads-190");
    assert.strictEqual(updated.status, "revoked", "Threads connection must be marked revoked on Meta error code 190");
  });

  test("24. Threads non-revocation client error preserves connection active status", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("threads-valid-token", TEST_SECRET);
    db.seedConnection({
      id: "conn-threads-non-rev",
      platform: "threads",
      access_token: accessEnc,
      refresh_token: null,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        error: {
          message: "Application is under maintenance or permission denied.",
          type: "OAuthException",
          code: 200
        }
      }), { status: 403, headers: { "Content-Type": "application/json" } });
    };

    const res = await refreshSocialConnection(db, db.getConnection("conn-threads-non-rev"), env);
    assert.strictEqual(res.success, false);

    const updated = db.getConnection("conn-threads-non-rev");
    assert.strictEqual(updated.status, "active", "Threads connection must remain active on non-revocation client errors");
  });

  test("25. Transient network failure releases concurrency lease immediately for retry", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("ref", TEST_SECRET);
    db.seedConnection({
      id: "conn-lease-fail-1",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      last_refreshed_at: null,
      status: "active"
    });

    // Step 1: First attempt throws network exception
    globalThis.fetch = async () => {
      throw new Error("Temporary socket hang up");
    };

    const res1 = await refreshSocialConnection(db, db.getConnection("conn-lease-fail-1"), env);
    assert.strictEqual(res1.success, false);

    // Verify lease was released: last_refreshed_at was restored to null
    const connAfterFail = db.getConnection("conn-lease-fail-1");
    assert.strictEqual(connAfterFail.last_refreshed_at, null, "Lease must be released on failure");

    // Step 2: Immediate retry succeeds without 30-second delay
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ access_token: "new-retry-acc", expires_in: 3600 }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    };

    const res2 = await refreshSocialConnection(db, db.getConnection("conn-lease-fail-1"), env);
    assert.strictEqual(res2.success, true, "Immediate retry must succeed because lease was released");
  });

  test("26. HTTP 429 rate limit releases concurrency lease immediately", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("ref", TEST_SECRET);
    db.seedConnection({
      id: "conn-lease-429",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      last_refreshed_at: null,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response("Too Many Requests", { status: 429 });
    };

    const res1 = await refreshSocialConnection(db, db.getConnection("conn-lease-429"), env);
    assert.strictEqual(res1.status, "rate_limited");

    const conn = db.getConnection("conn-lease-429");
    assert.strictEqual(conn.last_refreshed_at, null, "Lease must be released on rate limit");
  });

  test("27. Concurrency lease held in-flight returns concurrency_lease_active", async () => {
    const db = new MockD1();
    const env = createTestEnv();

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt("ref", TEST_SECRET);
    // Simulating lease held 5 seconds ago by another worker
    const heldTime = new Date(Date.now() - 5000).toISOString();
    db.seedConnection({
      id: "conn-in-flight",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      last_refreshed_at: heldTime,
      status: "active"
    });

    const res = await refreshSocialConnection(db, db.getConnection("conn-in-flight"), env);
    assert.strictEqual(res.success, false, "Must report success: false when lease is actively held in-flight");
    assert.strictEqual(res.status, "concurrency_lease_active");
  });

  test("28. Diagnostics and system events do not leak tokens, secrets, or credentials", async () => {
    const db = new MockD1();
    const secretLeak = "SUPER_SECRET_CLIENT_SECRET_98765";
    const tokenLeak = "SECRET_REFRESH_TOKEN_xyz123";

    const env = createTestEnv({
      GOOGLE_CLIENT_SECRET: secretLeak
    });

    const accessEnc = await encrypt("acc", TEST_SECRET);
    const refreshEnc = await encrypt(tokenLeak, TEST_SECRET);
    db.seedConnection({
      id: "conn-leak-check",
      platform: "google",
      access_token: accessEnc,
      refresh_token: refreshEnc,
      status: "active"
    });

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        error: "invalid_grant",
        error_description: "Token revoked"
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    };

    // Capture console output during refresh
    const consoleOutput = [];
    const origWarn = console.warn;
    const origError = console.error;
    console.warn = (...args) => consoleOutput.push(args.join(" "));
    console.error = (...args) => consoleOutput.push(args.join(" "));

    try {
      await refreshSocialConnection(db, db.getConnection("conn-leak-check"), env);
    } finally {
      console.warn = origWarn;
      console.error = origError;
    }

    const allConsole = consoleOutput.join("\n");
    assert.ok(!allConsole.includes(secretLeak), "Console output must not contain client secret");
    assert.ok(!allConsole.includes(tokenLeak), "Console output must not contain refresh token");
  });

  test("29. Real SQLite D1 semantics: atomic lease, rotation, and non-rotation in node:sqlite", async () => {
    const sqlDb = new DatabaseSync(":memory:");
    sqlDb.exec(`
      CREATE TABLE social_connections (
        id TEXT PRIMARY KEY,
        platform TEXT,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TEXT,
        status TEXT,
        last_refreshed_at TEXT,
        updated_at TEXT
      );
    `);

    // D1 adapter wrapping real SQLite DatabaseSync
    const realDb = {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async run() {
                const stmt = sqlDb.prepare(sql);
                const res = stmt.run(...args);
                return { success: true, changes: res.changes, meta: { changes: res.changes } };
              },
              async first() {
                const stmt = sqlDb.prepare(sql);
                return stmt.get(...args) || null;
              },
              async all() {
                const stmt = sqlDb.prepare(sql);
                return { results: stmt.all(...args) };
              }
            };
          }
        };
      }
    };

    const env = createTestEnv();
    const accessEnc = await encrypt("initial-acc", TEST_SECRET);
    const refreshEnc = await encrypt("initial-ref", TEST_SECRET);

    sqlDb.prepare(`
      INSERT INTO social_connections (id, platform, access_token, refresh_token, status, last_refreshed_at)
      VALUES (?, ?, ?, ?, 'active', NULL)
    `).run("sqlite-conn-1", "google", accessEnc, refreshEnc);

    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return new Response(JSON.stringify({
        access_token: "new-sqlite-access",
        refresh_token: "rotated-sqlite-refresh",
        expires_in: 3600
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const connRecord = await realDb.prepare("SELECT * FROM social_connections WHERE id = ?").bind("sqlite-conn-1").first();
    
    // Worker 1 executes refresh against real SQLite
    const res1 = await refreshSocialConnection(realDb, connRecord, env);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fetchCount, 1);

    // Verify row in real SQLite
    const row = sqlDb.prepare("SELECT * FROM social_connections WHERE id = ?").get("sqlite-conn-1");
    assert.strictEqual(row.status, "active");
    assert.ok(row.last_refreshed_at !== null, "last_refreshed_at must be populated in SQLite");
    const decryptedAccess = await decrypt(row.access_token, TEST_SECRET);
    const decryptedRefresh = await decrypt(row.refresh_token, TEST_SECRET);
    assert.strictEqual(decryptedAccess, "new-sqlite-access");
    assert.strictEqual(decryptedRefresh, "rotated-sqlite-refresh");

    // Worker 2 attempts refresh immediately on the same connection: SQLite lease prevents second fetch
    const res2 = await refreshSocialConnection(realDb, connRecord, env);
    assert.strictEqual(fetchCount, 1, "Real SQLite atomic lease must prevent second HTTP fetch");
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.status, "already_refreshed");
  });

});
