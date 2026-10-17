import { test, describe } from "node:test";
import assert from "node:assert";
import { handleUnifiedCallback } from "../../integrations/oauth_unified.js";

// Mock environment generator with isolated in-memory KV and database
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
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called when code/state is missing");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
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
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called when provider reports error");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Non-existent state in KV redirects with error without attempting token exchange", async () => {
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
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called for non-existent state");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Sequential replay is prevented: consumed state cannot be reused", async () => {
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
      // First attempt: valid state
      const req1 = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=validcode&state=${stateId}`);
      const res1 = await handleUnifiedCallback(req1, env);
      assert.strictEqual(res1.status, 302);
      assert.match(res1.headers.get("Location"), /oauth_success=facebook/);
      assert.strictEqual(tokenExchangeCalls, 1);
      assert.strictEqual(env.mypilotpost.rows.length, 1);

      // Verify state was consumed from KV
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null);

      // Second attempt: replaying consumed state must fail
      const req2 = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=validcode&state=${stateId}`);
      const res2 = await handleUnifiedCallback(req2, env);
      assert.strictEqual(res2.status, 302);
      assert.match(res2.headers.get("Location"), /Invalid%20or%20expired%20OAuth%20state/);
      assert.strictEqual(tokenExchangeCalls, 1, "Token exchange must not be called again on replayed state");
      assert.strictEqual(env.mypilotpost.rows.length, 1, "No additional connection should be persisted");
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

      // Callback invoked on 'facebook' route with state for 'pinterest'
      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=malicious-code&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);

      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /mismatch/i);
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must never be triggered on provider mismatch");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "Mismatched state must be consumed/invalidated");
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
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called on malformed state");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "Corrupt state must be purged from KV");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  /* ─────────────────────────────────────────────────────────────
     Task B — Independent Required-Field Regression Tests
  ───────────────────────────────────────────────────────────── */

  test("Task B.1: Missing brand_id in state is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const stateId = "missing-brand-id";
      const env = createMockEnv({
        [`state:${stateId}`]: JSON.stringify({
          // brand_id is undefined
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
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called when brand_id is missing");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Task B.2: Missing user_id in state is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const stateId = "missing-user-id";
      const env = createMockEnv({
        [`state:${stateId}`]: JSON.stringify({
          brand_id: "brand-123",
          // user_id is undefined
          platform: "facebook",
          timestamp: Date.now()
        })
      });

      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /missing%20required%20context/i);
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called when user_id is missing");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Task B.3: Missing platform in state is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      const stateId = "missing-platform";
      const env = createMockEnv({
        [`state:${stateId}`]: JSON.stringify({
          brand_id: "brand-123",
          user_id: "user-456",
          // platform is undefined
          timestamp: Date.now()
        })
      });

      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /missing%20required%20context/i);
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called when platform is missing");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Task B.4: Empty brand_id (empty string or whitespace) in state is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      for (const emptyBrand of ["", "   "]) {
        tokenExchangeAttempted = false;
        const stateId = `empty-brand-${Date.now()}-${Math.random()}`;
        const env = createMockEnv({
          [`state:${stateId}`]: JSON.stringify({
            brand_id: emptyBrand,
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
        assert.strictEqual(tokenExchangeAttempted, false, `Token exchange must not be called when brand_id is '${emptyBrand}'`);
        assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
        assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Task B.5: Empty user_id (empty string or whitespace) in state is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      for (const emptyUser of ["", "   "]) {
        tokenExchangeAttempted = false;
        const stateId = `empty-user-${Date.now()}-${Math.random()}`;
        const env = createMockEnv({
          [`state:${stateId}`]: JSON.stringify({
            brand_id: "brand-123",
            user_id: emptyUser,
            platform: "facebook",
            timestamp: Date.now()
          })
        });

        const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
        const res = await handleUnifiedCallback(req, env);
        assert.strictEqual(res.status, 302);
        const location = res.headers.get("Location");
        assert.match(location, /missing%20required%20context/i);
        assert.strictEqual(tokenExchangeAttempted, false, `Token exchange must not be called when user_id is '${emptyUser}'`);
        assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
        assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Task B.6: Empty platform (empty string or whitespace) in state is rejected", async () => {
    let tokenExchangeAttempted = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      tokenExchangeAttempted = true;
      return new Response("OK");
    };

    try {
      for (const emptyPlatform of ["", "   "]) {
        tokenExchangeAttempted = false;
        const stateId = `empty-platform-${Date.now()}-${Math.random()}`;
        const env = createMockEnv({
          [`state:${stateId}`]: JSON.stringify({
            brand_id: "brand-123",
            user_id: "user-456",
            platform: emptyPlatform,
            timestamp: Date.now()
          })
        });

        const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
        const res = await handleUnifiedCallback(req, env);
        assert.strictEqual(res.status, 302);
        const location = res.headers.get("Location");
        assert.match(location, /missing%20required%20context/i);
        assert.strictEqual(tokenExchangeAttempted, false, `Token exchange must not be called when platform is '${emptyPlatform}'`);
        assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
        assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  /* ─────────────────────────────────────────────────────────────
     Timestamp Bounds Regression Tests
  ───────────────────────────────────────────────────────────── */

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
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called on invalid timestamp");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed");
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
          timestamp: Date.now() + 120000 // 2 minutes in the future (> 60s skew tolerance)
        })
      });

      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=abc&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /future/i);
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called on future timestamp");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("State exceeding 10-minute lifetime (600,000ms) is rejected", async () => {
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
      assert.strictEqual(tokenExchangeAttempted, false, "Token exchange must not be called on expired timestamp");
      assert.strictEqual(env.mypilotpost.rows.length, 0, "No connection should be persisted");
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Valid callback completes token exchange and persists social connection", async () => {
    const stateId = "valid-full-flow-state";
    const env = createMockEnv({
      [`state:${stateId}`]: JSON.stringify({
        brand_id: "brand-xyz",
        user_id: "user-abc",
        platform: "facebook",
        timestamp: Date.now()
      })
    });

    let tokenExchangeCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      const u = typeof url === 'string' ? url : url.url;
      if (u.includes("graph.facebook.com") && u.includes("oauth/access_token")) {
        tokenExchangeCalled = true;
        return new Response(JSON.stringify({
          access_token: "mock-valid-fb-token",
          token_type: "bearer",
          expires_in: 5184000
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes("me/accounts")) {
        return new Response(JSON.stringify({
          data: [{ id: "page_456", name: "Primary Brand Page", category: "Brand", tasks: ["MANAGE"], access_token: "page_token_456" }]
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Not found", { status: 404 });
    };

    try {
      const req = new Request(`https://api.mypilotpost.com/api/oauth/facebook/callback?code=valid-auth-code&state=${stateId}`);
      const res = await handleUnifiedCallback(req, env);
      assert.strictEqual(res.status, 302);
      const location = res.headers.get("Location");
      assert.match(location, /oauth_success=facebook/);
      assert.strictEqual(tokenExchangeCalled, true, "Token exchange must be executed for valid state");
      assert.strictEqual(env.mypilotpost.rows.length, 1, "Connection must be persisted in database");
      assert.strictEqual(env.mypilotpost.rows[0].brand_id, "brand-xyz");
      assert.strictEqual(env.mypilotpost.rows[0].user_id, "user-abc");
      assert.strictEqual(env.mypilotpost.rows[0].platform, "facebook");
      assert.strictEqual(env.mypilotpost.rows[0].account_id, "page_456");
      assert.strictEqual(await env.OAUTH_STATE.get(`state:${stateId}`), null, "State must be consumed upon successful completion");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

});
