import { test, describe } from "node:test";
import assert from "node:assert";
import { handleUnifiedCallback } from "../../integrations/oauth_unified.js";

// Mock environment generator
function createMockEnv(initialKv = {}) {
  const kvStore = new Map(Object.entries(initialKv));
  const dbRows = [];

  const mockKv = {
    get: async (key) => kvStore.get(key) || null,
    put: async (key, value, opts) => { kvStore.set(key, value); },
    delete: async (key) => { kvStore.delete(key); },
    _store: kvStore
  };

  const mockDb = {
    prepare: (sql) => {
      return {
        bind: (...args) => ({
          first: async () => {
            if (sql.includes("SELECT id, selected_resource_id FROM social_connections")) {
              return dbRows.find(r => r.brand_id === args[0] && r.platform === args[1] && r.account_id === args[2]) || null;
            }
            return null;
          },
          run: async () => {
            if (sql.includes("INSERT INTO social_connections")) {
              dbRows.push({
                id: args[0],
                user_id: args[1],
                brand_id: args[2],
                platform: args[3],
                account_id: args[4],
                platform_username: args[5],
                access_token: args[6],
                refresh_token: args[7],
                status: 'active'
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 1 } };
          }
        })
      };
    },
    rows: dbRows
  };

  return {
    BASE_URL: "https://api.mypilotpost.com",
    FRONTEND_URL: "https://app.mypilotpost.com",
    ENCRYPTION_SECRET: "test-encryption-secret-minimum-32-chars-long!",
    FACEBOOK_CLIENT_ID: "fb-client-id",
    FACEBOOK_CLIENT_SECRET: "fb-client-secret",
    PINTEREST_APP_ID: "pin-app-id",
    PINTEREST_APP_SECRET: "pin-app-secret",
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    OAUTH_STATE: mockKv,
    mypilotpost: mockDb,
    DB: mockDb
  };
}

describe("OAUTH-001: Shared OAuth Callback State Validation", () => {

  test("Missing code or state redirects with error without attempting token exchange", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const env = createMockEnv();
      const req = new Request("https://api.mypilotpost.com/api/oauth/facebook/callback?code=testcode");
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /oauth_error=Missing%20code%20or%20state/);
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be attempted when state is missing");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Provider error parameter redirects with error without attempting token exchange", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const env = createMockEnv();
      const req = new Request("https://api.mypilotpost.com/api/oauth/facebook/callback?error=access_denied");
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /OAuth%20error%20from%20facebook%3A%20access_denied/);
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be attempted when provider returns error");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Non-existent state in KV redirects with Invalid or expired state error without attempting token exchange", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const env = createMockEnv();
      const req = new Request("https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=nonexistent-state");
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /Invalid%20or%20expired%20OAuth%20state/);
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be attempted for non-existent state");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("State replay is prevented (consumed state cannot be reused)", async () => {
    const stateId = "test-replay-state";
    const env = createMockEnv({
      [`state:${stateId}`]: JSON.stringify({
        brand_id: "brand-123",
        user_id: "user-456",
        platform: "facebook",
        timestamp: Date.now()
      })
    });

    let tokenExchangeCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      const u = typeof url === 'string' ? url : url.url;
      if (u.includes("graph.facebook.com") && u.includes("oauth/access_token")) {
        tokenExchangeCalls++;
        return new Response(JSON.stringify({
          access_token: "fb_token_123",
          token_type: "bearer",
          expires_in: 5184000
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes("me/accounts")) {
        return new Response(JSON.stringify({
          data: [{ id: "page_123", name: "My Facebook Page", category: "Brand", tasks: ["MANAGE"], access_token: "page_token_123" }]
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Not found", { status: 404 });
    };

    try {
      const req1 = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=validcode&state=${stateId}`);
      const res1 = await handleUnifiedCallback(req1, env);
      assert.strictEqual(res1.status, 302);
      assert.match(res1.headers.get("Location"), /oauth_success=facebook/);
      assert.strictEqual(tokenExchangeCalls, 1);

      // Second attempt with exact same state must be rejected because it was consumed
      const req2 = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=validcode&state=${stateId}`);
      const res2 = await handleUnifiedCallback(req2, env);
      assert.strictEqual(res2.status, 302);
      assert.match(res2.headers.get("Location"), /Invalid%20or%20expired%20OAuth%20state/);
      assert.strictEqual(tokenExchangeCalls, 1, "Token exchange must not be called again on replayed state");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("State provider mismatch is rejected before token exchange", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const stateId = "pinterest-state-123";
      const env = createMockEnv({
        [`state:${stateId}`]: JSON.stringify({
          brand_id: "brand-123",
          user_id: "user-456",
          platform: "pinterest",
          timestamp: Date.now()
        })
      });

      // Callback is invoked on 'facebook' callback route
      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=malicious-code&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);

      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /mismatch/i, `Expected location to report provider mismatch, got: ${location}`);
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must never be triggered on provider mismatch");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Malformed state JSON in KV is safely rejected and deleted", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const stateId = "corrupt-state";
      const env = createMockEnv({
        [`state:${stateId}`]: "{not-valid-json"
      });

      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /Malformed%20OAuth%20state/);
      assert.strictEqual(tokenExchangeAttempted, false);
      // Malformed state must be deleted from KV
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("State with missing required context fields is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const stateId = "missing-context-state";
      const env = createMockEnv({
        [`state:${stateId}`]: JSON.stringify({
          // brand_id is missing
          user_id: "user-456",
          platform: "facebook",
          timestamp: Date.now()
        })
      });

      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /missing%20required%20context/i);
      assert.strictEqual(tokenExchangeAttempted, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("State with invalid timestamp type is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const stateId = "bad-timestamp-state";
      const env = createMockEnv({
        [`state:${stateId}`]: JSON.stringify({
          brand_id: "brand-123",
          user_id: "user-456",
          platform: "facebook",
          timestamp: "not-a-timestamp"
        })
      });

      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /invalid%20timestamp/i);
      assert.strictEqual(tokenExchangeAttempted, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("State with future timestamp beyond clock-skew tolerance is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const stateId = "future-timestamp-state";
      const env = createMockEnv({
        [`state:${stateId}`]: JSON.stringify({
          brand_id: "brand-123",
          user_id: "user-456",
          platform: "facebook",
          timestamp: Date.now() + 120000 // 2 minutes in the future (> 1 min skew tolerance)
        })
      });

      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /future/i);
      assert.strictEqual(tokenExchangeAttempted, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("State exceeding 10-minute lifetime is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const stateId = "expired-state";
      const env = createMockEnv({
        [`state:${stateId}`]: JSON.stringify({
          brand_id: "brand-123",
          user_id: "user-456",
          platform: "facebook",
          timestamp: Date.now() - 601000 // 10 minutes and 1 second ago
        })
      });

      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /expired/i);
      assert.strictEqual(tokenExchangeAttempted, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

});
