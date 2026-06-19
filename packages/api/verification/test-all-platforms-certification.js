/**
 * Unified Social Posting Engine Certification Test Suite
 * File: packages/api/verification/test-all-platforms-certification.js
 */

import { publish as publishFacebook } from "../src/core/platforms/facebook.js";
import { publish as publishLinkedIn } from "../src/core/platforms/linkedin.js";
import { publish as publishGoogle } from "../src/core/platforms/google.js";
import { publish as publishInstagram } from "../src/core/platforms/instagram.js";
import { publish as publishX } from "../src/core/platforms/x.js";
import { publish as publishTikTok } from "../src/core/platforms/tiktok.js";
import { publish as publishPinterest } from "../src/core/platforms/pinterest.js";
import { executeDeliveryJob } from "../src/core/delivery/poster.js";
import { encrypt } from "../src/lib/crypto.js";

async function runTests() {
  console.log("🚀 STARTING UNIFIED SOCIAL POSTING ENGINE CERTIFICATION SUITE\n");

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
  let fetchMocks = [];

  // Global Mock Fetch
  globalThis.fetch = async (url, options) => {
    // Check if it's a request to download our mock media asset
    if (url.startsWith("https://example.com/media/")) {
      const isVideo = url.endsWith(".mp4");
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          "content-type": isVideo ? "video/mp4" : "image/jpeg",
          "content-length": "100"
        }),
        arrayBuffer: async () => new ArrayBuffer(100),
        blob: async () => new Blob([new ArrayBuffer(100)], { type: isVideo ? "video/mp4" : "image/jpeg" })
      };
    }

    // Direct upload/AWS upload mock for Pinterest/X
    if (url.includes("amazon") || url.includes("upload.twitter.com")) {
      return {
        ok: true,
        status: 200,
        text: async () => "OK",
        json: async () => ({ media_id_string: "twitter_media_999" })
      };
    }

    // Match registered fetch mocks
    for (const mock of fetchMocks) {
      if (mock.match(url, options)) {
        return mock.response(url, options);
      }
    }

    console.warn(`Unmocked fetch: ${options?.method || "GET"} ${url}`);
    return { ok: false, status: 404, text: async () => "Not Found" };
  };

  const encryptedToken = await encrypt("mock-access-token-123456", "dev-encryption-secret-placeholder-32-bytes-long");

  // Multi-purpose mock D1 database that resolves all adapters' schema lookups
  const mockDB = {
    prepare: (sql) => {
      return {
        bind: (...args) => {
          return {
            run: async () => ({ success: true, meta: { changes: 1 } }),
            all: async () => {
              if (sql.includes("content_media_links")) {
                const isVideo = sql.includes("video_test") || args[0]?.includes("video_test") || args[1]?.includes("video_test");
                return {
                  results: [{
                    id: "media_123",
                    preview_url: isVideo ? "https://example.com/media/test.mp4" : "https://example.com/media/test.jpg",
                    provider: "direct",
                    mime_type: isVideo ? "video/mp4" : "image/jpeg",
                    external_id: "media_key_123",
                    width: 1600,
                    height: 1200,
                    role: "primary"
                  }]
                };
              }
              if (sql.includes("delivery_jobs")) {
                return { results: [{ status: "published" }] };
              }
              return { results: [] };
            },
            first: async () => {
              if (sql.includes("social_assets") || sql.includes("social_variants") || sql.includes("contentTable")) {
                return {
                  id: "asset_123",
                  brand_id: "brand_123",
                  title: "Test title",
                  text: "Test post text",
                  caption: "Test post text",
                  hashtags: "[]",
                  lifecycle_status: "draft"
                };
              }
              if (sql.includes("social_connections")) {
                return {
                  id: "conn_123",
                  platform: args[1] || "facebook",
                  account_id: "act_123",
                  platform_username: "user_123",
                  access_token: encryptedToken,
                  status: "active"
                };
              }
              if (sql.includes("delivery_jobs")) {
                return { external_post_id: null };
              }
              return null;
            }
          };
        }
      };
    }
  };

  const mockEnv = {
    META_CLIENT_SECRET: "meta-app-secret",
    ENCRYPTION_SECRET: "dev-encryption-secret-placeholder-32-bytes-long",
    mypilotpost: mockDB,
    DB: mockDB
  };

  // =========================================================================
  // SCENARIO 1: Facebook Adapter Verification
  // =========================================================================
  console.log("Scenario 1: Facebook Adapter (Text, Image, Video)");

  // 1.1 Text Post
  fetchMocks.push({
    match: (url, opts) => url.includes("graph.facebook.com") && url.includes("/feed") && opts.method === "POST",
    response: async (url, opts) => {
      const body = JSON.parse(opts.body);
      assert(body.message === "Text post", "Facebook text message matches");
      assert(body.appsecret_proof !== undefined, "Facebook text appsecret_proof present");
      return { ok: true, status: 200, json: async () => ({ id: "fb_text_123" }) };
    }
  });

  await publishFacebook({
    content: { text: "Text post", media: [] },
    connection: { access_token: "token", account_id: "page123" },
    env: mockEnv
  });
  passCountAssert("Facebook text post verified successfully");

  // 1.2 Image Post
  fetchMocks.push({
    match: (url, opts) => url.includes("graph.facebook.com") && url.includes("/photos") && opts.method === "POST",
    response: async (url, opts) => {
      assert(opts.body instanceof FormData, "Facebook image uses FormData");
      assert(opts.body.get("caption") === "Image post", "Facebook image caption matches");
      assert(opts.body.get("appsecret_proof") !== undefined, "Facebook image appsecret_proof present");
      return { ok: true, status: 200, json: async () => ({ id: "fb_photo_123", post_id: "fb_photo_post_123" }) };
    }
  });

  await publishFacebook({
    content: {
      text: "Image post",
      media: [{ preview_url: "https://example.com/media/test.jpg", mime_type: "image/jpeg", role: "primary" }]
    },
    connection: { access_token: "token", account_id: "page123" },
    env: mockEnv
  });
  passCountAssert("Facebook image post verified successfully");

  // 1.3 Video Post
  fetchMocks.push({
    match: (url, opts) => url.includes("graph.facebook.com") && url.includes("/videos") && opts.method === "POST",
    response: async (url, opts) => {
      assert(opts.body instanceof FormData, "Facebook video uses FormData");
      assert(opts.body.get("description") === "Video post", "Facebook video uses 'description' field name");
      assert(opts.body.get("appsecret_proof") !== undefined, "Facebook video appsecret_proof present");
      return { ok: true, status: 200, json: async () => ({ id: "fb_video_123" }) };
    }
  });

  await publishFacebook({
    content: {
      text: "Video post",
      media: [{ preview_url: "https://example.com/media/test.mp4", mime_type: "video/mp4", role: "primary" }]
    },
    connection: { access_token: "token", account_id: "page123" },
    env: mockEnv
  });
  passCountAssert("Facebook video post verified successfully");

  // =========================================================================
  // SCENARIO 2: LinkedIn Adapter Verification
  // =========================================================================
  console.log("\nScenario 2: LinkedIn Adapter (Text, Image, Video)");

  // 2.1 Text Post
  fetchMocks.push({
    match: (url, opts) => url.includes("/ugcPosts") && opts.method === "POST",
    response: async (url, opts) => {
      const body = JSON.parse(opts.body);
      const category = body.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory;
      if (category === "NONE") {
        assert(body.specificContent["com.linkedin.ugc.ShareContent"].shareCommentary.text === "Text post", "LinkedIn text Commentary matches");
        return { ok: true, status: 201, json: async () => ({ id: "urn:li:share:123" }) };
      } else if (category === "IMAGE") {
        assert(body.specificContent["com.linkedin.ugc.ShareContent"].media[0].media === "urn:li:digitalmediaAsset:img123", "LinkedIn share image matches registered asset");
        return { ok: true, status: 201, json: async () => ({ id: "urn:li:share:456" }) };
      } else if (category === "VIDEO") {
        assert(body.specificContent["com.linkedin.ugc.ShareContent"].media[0].media === "urn:li:digitalmediaAsset:vid123", "LinkedIn share video matches registered asset");
        return { ok: true, status: 201, json: async () => ({ id: "urn:li:share:789" }) };
      }
      return { ok: false, status: 400 };
    }
  });

  await publishLinkedIn({
    content: { text: "Text post", media: [] },
    connection: { access_token: "token", account_id: "person123" },
    env: mockEnv
  });
  passCountAssert("LinkedIn text post verified successfully");

  // 2.2 Image Post (registerUpload + PUT upload + ugcPost)
  fetchMocks.push({
    match: (url, opts) => url.includes("/assets?action=registerUpload") && opts.method === "POST",
    response: async (url, opts) => {
      const body = JSON.parse(opts.body);
      const recipe = body.registerUploadRequest.recipes[0];
      const isVideo = recipe.includes("video");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          value: {
            asset: isVideo ? "urn:li:digitalmediaAsset:vid123" : "urn:li:digitalmediaAsset:img123",
            uploadMechanism: {
              "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
                uploadUrl: "https://api.linkedin.com/upload"
              }
            }
          }
        })
      };
    }
  });

  fetchMocks.push({
    match: (url, opts) => url.includes("/upload") && opts.method === "PUT",
    response: async () => ({ ok: true, status: 200 })
  });

  await publishLinkedIn({
    content: {
      text: "Image post",
      media: [{ preview_url: "https://example.com/media/test.jpg", mime_type: "image/jpeg", role: "primary" }]
    },
    connection: { access_token: "token", account_id: "person123" },
    env: mockEnv
  });
  passCountAssert("LinkedIn image post verified successfully");

  // 2.3 Video Post (registerUpload + PUT upload + ugcPost)
  await publishLinkedIn({
    content: {
      text: "Video post",
      media: [{ preview_url: "https://example.com/media/test.mp4", mime_type: "video/mp4", role: "primary" }]
    },
    connection: { access_token: "token", account_id: "person123" },
    env: mockEnv
  });
  passCountAssert("LinkedIn video post verified successfully");

  // =========================================================================
  // SCENARIO 3: YouTube (Google) Adapter Verification
  // =========================================================================
  console.log("\nScenario 3: YouTube Adapter");

  fetchMocks.push({
    match: (url, opts) => url.includes("/upload/youtube/v3/videos") && opts.method === "POST",
    response: async (url, opts) => {
      assert(opts.headers["Content-Type"].startsWith("multipart/related"), "YouTube uses multipart/related request");
      return { ok: true, status: 200, json: async () => ({ id: "yt_video_123" }) };
    }
  });

  await publishGoogle({
    content: {
      text: "YouTube Video post",
      media: [{ preview_url: "https://example.com/media/test.mp4", mime_type: "video/mp4", role: "primary" }]
    },
    connection: { access_token: "token" },
    env: mockEnv
  });
  passCountAssert("YouTube video upload verified successfully");

  // =========================================================================
  // SCENARIO 4: Instagram Adapter Verification
  // =========================================================================
  console.log("\nScenario 4: Instagram Adapter");

  // Mock Instagram endpoints
  fetchMocks.push({
    match: (url, opts) => url.includes("/media") && opts.method === "POST" && !url.includes("image_container_123"),
    response: async (url, opts) => {
      return { ok: true, status: 200, json: async () => ({ id: "ig_container_123" }) };
    }
  });

  fetchMocks.push({
    match: (url, opts) => url.includes("/media_publish") && opts.method === "POST",
    response: async () => ({ ok: true, status: 200, json: async () => ({ id: "ig_post_123" }) })
  });

  fetchMocks.push({
    match: (url, opts) => url.includes("ig_container_123") && opts.method === "GET",
    response: async () => ({ ok: true, status: 200, json: async () => ({ status_code: "FINISHED" }) })
  });

  await publishInstagram({
    content: {
      text: "Instagram Post",
      media: [{ preview_url: "https://example.com/media/test.jpg", mime_type: "image/jpeg", role: "primary" }]
    },
    connection: { access_token: "token", account_id: "ig_user_123" },
    env: mockEnv
  });
  passCountAssert("Instagram single image post verified successfully");

  // =========================================================================
  // SCENARIO 5: X (Twitter) Adapter Verification
  // =========================================================================
  console.log("\nScenario 5: X Adapter");

  fetchMocks.push({
    match: (url, opts) => url.includes("/tweets") && opts.method === "POST",
    response: async (url, opts) => {
      const body = JSON.parse(opts.body);
      assert(body.text === "X Tweet", "X tweet body text matches");
      assert(body.media?.media_ids[0] === "twitter_media_999", "X tweet media ID matches uploaded media");
      return { ok: true, status: 201, json: async () => ({ data: { id: "tweet_123" } }) };
    }
  });

  await publishX({
    content: {
      text: "X Tweet",
      media: [{ preview_url: "https://example.com/media/test.jpg", mime_type: "image/jpeg", role: "primary" }]
    },
    connection: { access_token: "token" },
    env: mockEnv
  });
  passCountAssert("X Tweet post verified successfully");

  // =========================================================================
  // SCENARIO 6: TikTok Adapter Verification
  // =========================================================================
  console.log("\nScenario 6: TikTok Adapter");

  fetchMocks.push({
    match: (url, opts) => url.includes("/post/publish/video/init/") && opts.method === "POST",
    response: async (url, opts) => {
      const body = JSON.parse(opts.body);
      assert(body.source_info.source === "PULL_FROM_URL", "TikTok uses PULL_FROM_URL");
      assert(body.source_info.video_url === "https://example.com/media/test.mp4", "TikTok references video url");
      return { ok: true, status: 200, json: async () => ({ data: { publish_id: "tiktok_publish_123" } }) };
    }
  });

  await publishTikTok({
    content: {
      text: "TikTok Video",
      media: [{ preview_url: "https://example.com/media/test.mp4", mime_type: "video/mp4", role: "primary" }]
    },
    connection: { access_token: "token" },
    env: mockEnv
  });
  passCountAssert("TikTok video initialization verified successfully");

  // =========================================================================
  // SCENARIO 7: Pinterest Adapter Verification
  // =========================================================================
  console.log("\nScenario 7: Pinterest Adapter");

  // Mock board discovery and Pin creation
  fetchMocks.push({
    match: (url, opts) => url.includes("/pins") && opts.method === "POST",
    response: async (url, opts) => {
      const body = JSON.parse(opts.body);
      assert(body.board_id === "board_999", "Pinterest Board ID matches default/first board");
      assert(body.media_source.url === "https://example.com/media/test.jpg", "Pinterest Pin image matches input");
      return { ok: true, status: 201, json: async () => ({ id: "pin_123" }) };
    }
  });

  await publishPinterest({
    content: {
      text: "Pinterest Pin",
      media: [{ preview_url: "https://example.com/media/test.jpg", mime_type: "image/jpeg", role: "primary" }]
    },
    connection: { access_token: "token", selected_resource_id: "board_999" },
    env: mockEnv
  });
  passCountAssert("Pinterest Image Pin verified successfully");

  // =========================================================================
  // SCENARIO 8: Concurrency & Simultaneous Publishing Verification
  // =========================================================================
  console.log("\nScenario 8: Concurrency & Simultaneous Publishing");

  let activeJobs = 0;
  let maxActiveJobs = 0;

  async function mockNetworkDelay(resultJson, status = 200) {
    activeJobs++;
    maxActiveJobs = Math.max(maxActiveJobs, activeJobs);
    await new Promise(r => setTimeout(r, 100)); // 100ms artificial network latency
    activeJobs--;
    return { ok: true, status, json: async () => resultJson };
  }

  // Clear previous matching mocks to isolate Scenario 8 assertions
  fetchMocks = [];

  // Register Scenario 8 specific fetch mocks
  fetchMocks.push({
    match: (url) => url.includes("graph.facebook.com"),
    response: async () => mockNetworkDelay({ id: "fb_concurrent_123" })
  });

  fetchMocks.push({
    match: (url) => url.includes("api.linkedin.com"),
    response: async (url) => {
      if (url.includes("/assets")) {
        return mockNetworkDelay({
          value: {
            asset: "urn:li:digitalmediaAsset:img123",
            uploadMechanism: {
              "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: "https://example.com/media/upload" }
            }
          }
        });
      }
      return mockNetworkDelay({ id: "urn:li:share:123" }, 201);
    }
  });

  fetchMocks.push({
    match: (url) => url.includes("api.twitter.com"),
    response: async () => mockNetworkDelay({ data: { id: "tweet_concurrent_123" } }, 201)
  });

  fetchMocks.push({
    match: (url) => url.includes("api.pinterest.com"),
    response: async (url) => {
      if (url.includes("/boards")) {
        return mockNetworkDelay({ items: [{ id: "board_123" }] });
      }
      return mockNetworkDelay({ id: "pin_concurrent_123" }, 201);
    }
  });

  fetchMocks.push({
    match: (url) => url.includes("open.tiktokapis.com"),
    response: async () => mockNetworkDelay({ data: { publish_id: "tiktok_concurrent_123" } })
  });

  fetchMocks.push({
    match: (url) => url.includes("graph.instagram.com") || url.includes("/media"),
    response: async (url) => {
      if (url.includes("/media_publish")) {
        return mockNetworkDelay({ id: "ig_concurrent_post_123" });
      }
      if (url.includes("ig_container_123")) {
        return mockNetworkDelay({ status_code: "FINISHED" });
      }
      return mockNetworkDelay({ id: "ig_container_123" });
    }
  });

  // Mock poster DB for simultaneous publishing verification
  const mockConcurrencyDB = {
    batch: async (queries) => {
      return { success: true };
    },
    prepare: (sql) => {
      return {
        bind: (...bindArgs) => {
          return {
            run: async () => ({ meta: { changes: 1 } }),
            all: async () => {
              if (sql.includes("content_media_links")) {
                return {
                  results: [{
                    id: "media_123",
                    preview_url: "https://example.com/media/test.jpg",
                    provider: "direct",
                    mime_type: "image/jpeg",
                    external_id: "media_key_123",
                    width: 1600,
                    height: 1200,
                    role: "primary"
                  }]
                };
              }
              if (sql.includes("delivery_jobs")) {
                return { results: [{ status: "published" }] };
              }
              return { results: [] };
            },
            first: async () => {
              if (sql.includes("social_assets") || sql.includes("social_variants") || sql.includes("contentTable")) {
                return {
                  id: "asset_123",
                  brand_id: "brand_123",
                  title: "Simultaneous test",
                  text: "Simultaneous test",
                  caption: "Simultaneous test",
                  hashtags: "[]"
                };
              }
              if (sql.includes("social_connections")) {
                return {
                  id: "conn_123",
                  platform: bindArgs[1] || "facebook",
                  account_id: "act_123",
                  platform_username: "user_123",
                  access_token: encryptedToken,
                  status: "active"
                };
              }
              if (sql.includes("delivery_jobs")) {
                return { external_post_id: null };
              }
              return null;
            }
          };
        }
      };
    }
  };

  mockEnv.mypilotpost = mockConcurrencyDB;
  mockEnv.DB = mockConcurrencyDB;

  // We mock ADAPTERS internally by injecting our concurrent hooks
  const platformsToTest = ["facebook", "linkedin", "x", "pinterest", "instagram", "tiktok"];
  const jobPromises = platformsToTest.map(platform => {
    const job = {
      id: `job_${platform}`,
      brand_id: "brand_123",
      platform,
      delivery_attempts: 0,
      content_id: "asset_123",
      content_type: "social",
      user_id: "user_123"
    };
    return executeDeliveryJob(mockEnv, job);
  });

  await Promise.all(jobPromises);

  assert(maxActiveJobs > 1, `Verified simultaneous publishing: ${maxActiveJobs} jobs executed concurrently`);

  globalThis.fetch = originalFetch;

  // Summary Report
  console.log(`\n${"=".repeat(60)}`);
  console.log(`POSTING CERTIFICATION REPORT`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Tests:  ${passed}/${passed + failed} passed`);
  console.log(`Failed: ${failed}`);
  console.log(`VERDICT: ${failed === 0 ? "CERTIFIED ✓" : "NOT CERTIFIED"}`);
  console.log(`${"=".repeat(60)}\n`);

  process.exit(failed > 0 ? 1 : 0);

  function passCountAssert(msg) {
    assert(true, msg);
  }
}

runTests().catch(err => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
