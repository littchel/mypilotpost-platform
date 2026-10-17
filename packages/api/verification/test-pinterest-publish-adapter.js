import { webcrypto } from "crypto";
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

import { listPinterestBoards } from "../src/integrations/google-accounts.js";
import { handleUnifiedCallback } from "../src/integrations/oauth_unified.js";
import { publish } from "../src/core/platforms/pinterest.js";
import { refreshSocialConnection, ensureValidConnection } from "../src/integrations/refresh_manager.js";
import { encrypt } from "../src/lib/crypto.js";

async function runTests() {
  console.log("🚀 STARTING PINTEREST PUBLISH & CONFIGURATION TEST SUITE\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const originalFetch = globalThis.fetch;

  function setupFetchMock(handler) {
    globalThis.fetch = async (url, options) => {
      const parsedBody = options?.body
        ? (typeof options.body === "string"
            ? JSON.parse(options.body)
            : options.body)
        : null;
      return handler(url, options, parsedBody);
    };
  }

  // =========================================================================
  // TEST 1: Board Discovery & Bookmark Pagination
  // =========================================================================
  console.log("Test 1: Board Discovery & Bookmark Pagination");

  let fetchCalls = [];
  setupFetchMock((url, options) => {
    fetchCalls.push({ url, options });
    const urlObj = new URL(url);
    const bookmark = urlObj.searchParams.get("bookmark");

    if (!bookmark) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [{ id: "board-1", name: "Board One", privacy: "PUBLIC" }],
          bookmark: "next-page-bookmark"
        })
      };
    } else if (bookmark === "next-page-bookmark") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [{ id: "board-2", name: "Board Two", privacy: "PROTECTED" }],
          bookmark: null
        })
      };
    }
    return { ok: false, status: 400 };
  });

  try {
    const boards = await listPinterestBoards("mock-access-token");
    assert(boards.length === 2, "Should retrieve exactly 2 boards across paginated pages");
    assert(boards[0].id === "board-1" && boards[0].name === "Board One", "First board matches");
    assert(boards[1].id === "board-2" && boards[1].name === "Board Two", "Second board matches");
    assert(fetchCalls.length === 2, "Should make exactly two paginated fetch calls");
  } catch (err) {
    assert(false, `Board discovery pagination failed: ${err.message}`);
  }

  // =========================================================================
  // TEST 2: Unified OAuth Callback Redirect & Auto-Default Assignment
  // =========================================================================
  console.log("\nTest 2: Unified OAuth Callback (Auto-Default Assignment: Exactly 1 Board)");

  // Scenario A: Exactly 1 board exists
  let dbUpdates = [];
  let dbQueries = [];
  const mockDB = {
    prepare: (sql) => {
      return {
        bind: (...args) => {
          return {
            first: async () => {
              dbQueries.push({ sql, args });
              if (sql.includes("SELECT id, selected_resource_id")) {
                // No previous selection
                return { id: "existing-conn-123", selected_resource_id: null };
              }
              return null;
            },
            run: async () => {
              dbUpdates.push({ sql, args });
              return { success: true, meta: { changes: 1 } };
            }
          };
        }
      };
    }
  };

  const mockEnv = {
    mypilotpost: mockDB,
    DB: mockDB,
    ENCRYPTION_SECRET: "my-super-secret-key-must-be-32-bytes-long",
    FRONTEND_URL: "https://dashboard.mypilotpost.com",
    BASE_URL: "https://api.mypilotpost.com",
    PINTEREST_CLIENT_ID: "pin-client-id",
    PINTEREST_CLIENT_SECRET: "pin-client-secret",
    OAUTH_STATE: {
      get: async () => JSON.stringify({ brand_id: "brand-1", user_id: "user-1" }),
      delete: async () => {}
    }
  };

  // Mock token response and board fetch (exactly 1 board)
  setupFetchMock((url, options) => {
    if (url.includes("/v5/oauth/token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "mock-access-token",
          expires_in: 3600,
          scope: "boards:read,pins:write"
        })
      };
    }
    if (url.includes("/v5/user_account")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ username: "pinterest_user_99" })
      };
    }
    if (url.includes("/v5/boards")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [{ id: "single-board-id", name: "Single Board" }]
        })
      };
    }
    return { ok: false, status: 400 };
  });

  const mockRequest = {
    url: "https://api.mypilotpost.com/api/oauth/pinterest/callback?code=mock-code&state=mock-state"
  };

  // Temporarily define global Response redirect method
  const originalRedirect = Response.redirect;
  let redirectedTo = null;
  Response.redirect = (url, status) => {
    redirectedTo = url;
    return { status, headers: new Headers({ Location: url }) };
  };

  try {
    await handleUnifiedCallback(mockRequest, mockEnv);
    assert(redirectedTo === "https://dashboard.mypilotpost.com?oauth_success=pinterest", "Bypasses resource selection redirect");
    const saveUpdate = dbUpdates.find(u => u.sql.includes("selected_resource_id"));
    assert(saveUpdate !== undefined, "Executed auto-assignment database update");
    assert(saveUpdate.args[0] === "single-board-id", "Saved board ID matches single board found");
    assert(saveUpdate.args[1] === "Single Board", "Saved board name matches single board found");
  } catch (err) {
    assert(false, `OAuth callback auto-default failed: ${err.message}`);
  }

  // Scenario B: Multiple boards exist (Requires Picker selection)
  console.log("\nTest 3: Unified OAuth Callback (Needs Selection: Multiple Boards)");
  redirectedTo = null;
  dbUpdates = [];
  setupFetchMock((url) => {
    if (url.includes("/v5/oauth/token")) {
      return { ok: true, status: 200, json: async () => ({ access_token: "mock-token", expires_in: 3600 }) };
    }
    if (url.includes("/v5/user_account")) {
      return { ok: true, status: 200, json: async () => ({ username: "pin_user" }) };
    }
    if (url.includes("/v5/boards")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: "board-a", name: "Board A" },
            { id: "board-b", name: "Board B" }
          ]
        })
      };
    }
    return { ok: false, status: 400 };
  });

  try {
    await handleUnifiedCallback(mockRequest, mockEnv);
    assert(redirectedTo.includes("needs_selection=1"), "Redirects to resource picker UI");
    const needsSelUpdate = dbUpdates.find(u => u.sql.includes("status = 'CONNECTED_NEEDS_RESOURCE'"));
    assert(needsSelUpdate !== undefined, "Sets connection status to CONNECTED_NEEDS_RESOURCE");
  } catch (err) {
    assert(false, `OAuth callback multiple boards failed: ${err.message}`);
  }

  // =========================================================================
  // TEST 4: Pinterest Adapter Pin Creation Format Verification
  // =========================================================================
  console.log("\nTest 4: Pinterest Adapter — Image Pin");

  const mockConnection = {
    access_token: "mock-token-xyz",
    selected_resource_id: "selected-board-456",
    metadata: {}
  };

  let pinCreationBody = null;
  setupFetchMock((url, options, body) => {
    if (url.includes("/v5/pins") && options.method === "POST") {
      pinCreationBody = body;
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: "pin_image_123" })
      };
    }
    return { ok: false, status: 400 };
  });

  const contentImage = {
    text: "Check out this beautiful image!",
    media: [{ preview_url: "https://example.com/art.jpg", mime_type: "image/jpeg" }]
  };

  try {
    const result = await publish({ content: contentImage, connection: mockConnection, env: mockEnv });
    assert(result.success === true, "Adapter publish returns success");
    assert(result.external_id === "pin_image_123", "Returns external ID");
    assert(result.board_id === "selected-board-456", "Returns board ID");
    assert(result.published_at !== undefined, "Returns publish timestamp");
    assert(pinCreationBody.media_source.source_type === "image_url", "Payload has correct image source type");
    assert(pinCreationBody.media_source.url === "https://example.com/art.jpg", "Payload has correct image URL");
  } catch (err) {
    assert(false, `Image pin publish failed: ${err.message}`);
  }

  // Link Pin Format Verification
  console.log("\nTest 5: Pinterest Adapter — Link Pin");
  pinCreationBody = null;
  const contentLink = {
    text: "Read our new blog post!",
    link: "https://mypilotpost.com/blog/getting-started",
    media: [{ preview_url: "https://example.com/art.jpg", mime_type: "image/jpeg" }]
  };

  try {
    await publish({ content: contentLink, connection: mockConnection, env: mockEnv });
    assert(pinCreationBody.link === "https://mypilotpost.com/blog/getting-started", "Appends click-through destination link to the pin creation payload");
  } catch (err) {
    assert(false, `Link pin publish failed: ${err.message}`);
  }

  // Video Pin Format Verification
  console.log("\nTest 6: Pinterest Adapter — Video Pin (Asynchronous Multi-step Upload)");

  let mediaRegisterCalled = false;
  let awsUploadCalled = false;
  let mediaPollCount = 0;

  setupFetchMock((url, options, body) => {
    if (url.includes("/v5/media") && options.method === "POST") {
      mediaRegisterCalled = true;
      assert(body.media_type === "video", "Registers media with media_type video");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          media_id: "vid-media-888",
          upload_url: "https://mock-aws-s3-bucket.com/upload",
          upload_parameters: {
            key: "video-key-abc",
            AWSAccessKeyId: "mock-aws-key"
          }
        })
      };
    }
    if (url.includes("mock-aws-s3-bucket.com") && options.method === "POST") {
      awsUploadCalled = true;
      return { ok: true, status: 200, text: async () => "Success" };
    }
    if (url.includes("/v5/media/vid-media-888") && options.method === "GET") {
      mediaPollCount++;
      // Return succeed status on second poll attempt
      const status = mediaPollCount < 2 ? "registered" : "succeeded";
      return {
        ok: true,
        status: 200,
        json: async () => ({ status })
      };
    }
    if (url.includes("/v5/pins") && options.method === "POST") {
      pinCreationBody = body;
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: "pin_video_555" })
      };
    }
    // Mock the download of the source video
    if (url.includes("source-video.mp4")) {
      return {
        ok: true,
        status: 200,
        blob: async () => new Blob(["dummy-video-data"], { type: "video/mp4" })
      };
    }
    return { ok: false, status: 400 };
  });

  const contentVideo = {
    text: "Check out this awesome video!",
    media: [{ preview_url: "https://example.com/source-video.mp4", mime_type: "video/mp4" }]
  };

  try {
    await publish({ content: contentVideo, connection: mockConnection, env: mockEnv });
    assert(false, "Video pin publish should have failed early");
  } catch (err) {
    assert(err.message === "Videos are not supported on Pinterest Pins. Please use images.", `Expected video blocker error, got: ${err.message}`);
  }


  // =========================================================================
  // TEST 7: Preemptive Token Refresh & Fallback Env Resolution
  // =========================================================================
  console.log("\nTest 7: Preemptive Token Refresh & Fallback Env Resolution");

  let refreshDbUpdates = [];
  const mockRefreshDB = {
    prepare: (sql) => {
      return {
        bind: (...args) => {
          return {
            run: async () => {
              refreshDbUpdates.push({ sql, args });
              return { success: true };
            },
            first: async () => {
              // Return connection with active status
              return {
                id: "connection-123",
                platform: "pinterest",
                access_token: "encrypted-new-access-token",
                refresh_token: "encrypted-pinterest-refresh-token",
                expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                status: "active"
              };
            }
          };
        }
      };
    }
  };

  const mockRefreshEnv = {
    mypilotpost: mockRefreshDB,
    DB: mockRefreshDB,
    ENCRYPTION_SECRET: "my-super-secret-key-must-be-32-bytes-long",
    // ONLY PINTEREST_APP_ID / SECRET are set (fallback check)
    PINTEREST_APP_ID: "fallback-app-id",
    PINTEREST_APP_SECRET: "fallback-app-secret"
  };

  const encryptedRefreshToken = await encrypt("pinterest-refresh-token", "my-super-secret-key-must-be-32-bytes-long");

  const mockExpiringConnection = {
    id: "connection-123",
    platform: "pinterest",
    access_token: "encrypted-old-access-token",
    refresh_token: encryptedRefreshToken,
    expires_at: new Date(Date.now() - 60000).toISOString(), // Expired 1 min ago
    status: "active"
  };

  let tokenRefreshCalled = false;
  let sentAuthHeader = null;

  setupFetchMock((url, options) => {
    if (url.includes("/v5/oauth/token") && options.method === "POST") {
      tokenRefreshCalled = true;
      sentAuthHeader = options.headers?.["Authorization"];
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "refreshed-access-token",
          expires_in: 86400
        })
      };
    }
    return { ok: false, status: 400 };
  });

  try {
    const validConn = await ensureValidConnection(mockRefreshDB, mockExpiringConnection, mockRefreshEnv);
    assert(tokenRefreshCalled, "Preemptive refresh triggered when token is expiring/expired");
    assert(sentAuthHeader === `Basic ${btoa("fallback-app-id:fallback-app-secret")}`, "Basic Auth correctly resolves using fallback PINTEREST_APP_ID environment credentials");
    assert(refreshDbUpdates.some(u => u.sql.includes("UPDATE social_connections")), "Updates social_connections with new tokens in DB");
    assert(validConn.access_token === "encrypted-new-access-token", "Returns updated connection");
  } catch (err) {
    assert(false, `Pinterest preemptive refresh test failed: ${err.message}`);
  }

  // Restore fetch and response
  globalThis.fetch = originalFetch;
  Response.redirect = originalRedirect;

  console.log(`\nPinterest Config & Adapter Test Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("✅ ALL PINTEREST TESTS PASSED SUCCESSFULLY");
  }
}

runTests();
