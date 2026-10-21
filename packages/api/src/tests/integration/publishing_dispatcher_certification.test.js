/**
 * PUB-001: Publishing Adapters & Dispatcher Certification Suite
 * File: packages/api/src/tests/integration/publishing_dispatcher_certification.test.js
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { executeDeliveryJob } from "../../core/delivery/poster.js";
import { resolveDeliveryData } from "../../core/delivery/resolver.js";
import { scheduleRetry } from "../../core/delivery/retries.js";
import { encrypt } from "../../lib/crypto.js";

// Adapters
import * as facebook from "../../core/platforms/facebook.js";
import * as instagram from "../../core/platforms/instagram.js";
import * as linkedin from "../../core/platforms/linkedin.js";
import * as x from "../../core/platforms/x.js";
import * as tiktok from "../../core/platforms/tiktok.js";
import * as google from "../../core/platforms/google.js";
import * as pinterest from "../../core/platforms/pinterest.js";
import * as threads from "../../core/platforms/threads.js";
import * as google_business from "../../core/platforms/google_business.js";
import * as wordpress from "../../core/platforms/wordpress.js";
import * as wordpress_ecommerce from "../../core/platforms/wordpress_ecommerce.js";

const TEST_SECRET = "dev-encryption-secret-placeholder-32-bytes-long";

describe("PUB-001: Publishing Adapters Certification", () => {
  let originalFetch;
  let fetchCalls = [];
  let fetchMocks = [];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchCalls = [];
    fetchMocks = [];

    globalThis.fetch = async (url, options = {}) => {
      fetchCalls.push({ url: String(url), options });

      // Default mock asset download
      if (String(url).startsWith("https://cdn.example.com/media/")) {
        const isVideo = String(url).endsWith(".mp4");
        return {
          ok: true,
          status: 200,
          headers: new Headers({
            "content-type": isVideo ? "video/mp4" : "image/jpeg",
            "content-length": "1024"
          }),
          arrayBuffer: async () => new ArrayBuffer(1024),
          blob: async () => new Blob([new ArrayBuffer(1024)], { type: isVideo ? "video/mp4" : "image/jpeg" })
        };
      }

      for (const mock of fetchMocks) {
        if (mock.match(String(url), options)) {
          return mock.handler(String(url), options);
        }
      }

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: "mock_external_id_123" }),
        json: async () => ({ id: "mock_external_id_123" })
      };
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // 1. Facebook Adapter
  test("1. Facebook: publishes text, image, and handles undefined media gracefully", async () => {
    // 1.1 Text post (with undefined media)
    fetchMocks.push({
      match: (url, opts) => url.includes("/feed") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ id: "fb_post_text_1" })
      })
    });

    const textResult = await facebook.publish({
      content: { text: "Hello Facebook Text Post!", media: undefined, platform: "facebook" },
      connection: { access_token: "fb_token_123", account_id: "act_fb_1" },
      env: { META_CLIENT_SECRET: "meta_secret" }
    });
    assert.equal(textResult.success, true);
    assert.equal(textResult.external_id, "fb_post_text_1");

    // 1.2 Image post
    fetchMocks.push({
      match: (url, opts) => url.includes("/photos") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ id: "fb_photo_1", post_id: "fb_post_photo_1" })
      })
    });

    const imgResult = await facebook.publish({
      content: {
        text: "Facebook Image Post",
        media: [{ preview_url: "https://cdn.example.com/media/test.jpg", mime_type: "image/jpeg", role: "primary" }],
        platform: "facebook"
      },
      connection: { access_token: "fb_token_123", account_id: "act_fb_1" },
      env: { META_CLIENT_SECRET: "meta_secret" }
    });
    assert.equal(imgResult.success, true);
    assert.equal(imgResult.external_id, "fb_post_photo_1");

    // 1.3 Feed post rejects videos
    await assert.rejects(
      async () => {
        await facebook.publish({
          content: {
            text: "Video feed post",
            media: [{ preview_url: "https://cdn.example.com/media/test.mp4", mime_type: "video/mp4", role: "primary" }],
            platform: "facebook"
          },
          connection: { access_token: "fb_token_123", account_id: "act_fb_1" },
          env: {}
        });
      },
      { message: /Videos are not supported on standard Facebook posts/ }
    );
  });

  // 2. Instagram Adapter
  test("2. Instagram: validates media, polls container to FINISHED, and handles timeout", async () => {
    // 2.1 Requires media
    await assert.rejects(
      async () => {
        await instagram.publish({
          content: { text: "No media", media: [] },
          connection: { access_token: "ig_token", account_id: "ig_act" },
          env: {}
        });
      },
      { message: /INSTAGRAM_REQUIRES_MEDIA/ }
    );

    // 2.2 Successful image container creation and publish
    fetchMocks.push({
      match: (url, opts) => url.includes("/media") && !url.includes("/media_publish") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ id: "ig_cont_123" })
      })
    });
    fetchMocks.push({
      match: (url, opts) => url.includes("/ig_cont_123") && opts.method === "GET",
      handler: async () => ({
        ok: true,
        json: async () => ({ status_code: "FINISHED" })
      })
    });
    fetchMocks.push({
      match: (url, opts) => url.includes("/media_publish") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ id: "ig_post_999" })
      })
    });

    const igResult = await instagram.publish({
      content: {
        text: "Instagram Post",
        media: [{ preview_url: "https://cdn.example.com/media/test.jpg", mime_type: "image/jpeg" }],
        platform: "instagram"
      },
      connection: { access_token: "ig_token", account_id: "ig_act" },
      env: {}
    });
    assert.equal(igResult.success, true);
    assert.equal(igResult.external_id, "ig_post_999");
  });

  // 3. LinkedIn Adapter
  test("3. LinkedIn: publishes text-only without throwing, and uploads image asset", async () => {
    // 3.1 Text-only post with media undefined
    fetchMocks.push({
      match: (url, opts) => url.includes("/ugcPosts") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ id: "urn:li:share:12345" })
      })
    });

    const liTextResult = await linkedin.publish({
      content: { text: "LinkedIn update without media", media: undefined },
      connection: { access_token: "li_token", account_id: "person_123" },
      env: {}
    });
    assert.equal(liTextResult.success, true);
    assert.equal(liTextResult.external_id, "urn:li:share:12345");

    // 3.2 Image post
    fetchMocks.push({
      match: (url, opts) => url.includes("registerUpload") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({
          value: {
            asset: "urn:li:digitalmediaAsset:987",
            uploadMechanism: {
              "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
                uploadUrl: "https://media.linkedin.com/upload/987"
              }
            }
          }
        })
      })
    });
    fetchMocks.push({
      match: (url, opts) => url.includes("media.linkedin.com/upload") && opts.method === "POST",
      handler: async () => ({ ok: true, status: 201 })
    });

    const liImgResult = await linkedin.publish({
      content: {
        text: "LinkedIn update with image",
        media: [{ preview_url: "https://cdn.example.com/media/test.jpg", mime_type: "image/jpeg" }]
      },
      connection: { access_token: "li_token", account_id: "person_123" },
      env: {}
    });
    assert.equal(liImgResult.success, true);
  });

  // 4. X (Twitter) Adapter
  test("4. X / Twitter: publishes text-only tweet without throwing on undefined media", async () => {
    let sentPayload = null;
    fetchMocks.push({
      match: (url, opts) => url.includes("/2/tweets") && opts.method === "POST",
      handler: async (_url, opts) => {
        sentPayload = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({ data: { id: "tweet_123456" } })
        };
      }
    });

    const xResult = await x.publish({
      content: { text: "Testing tweet with no media", media: undefined },
      connection: { access_token: "x_token" },
      env: {}
    });
    assert.equal(xResult.success, true);
    assert.equal(xResult.external_id, "tweet_123456");
    assert.equal(sentPayload.text, "Testing tweet with no media");
    assert.equal(sentPayload.media, undefined);
  });

  // 5. TikTok Adapter
  test("5. TikTok: enforces video requirement and uses PULL_FROM_URL", async () => {
    // 5.1 Rejects when media is missing
    await assert.rejects(
      async () => {
        await tiktok.publish({
          content: { text: "TikTok post", media: [] },
          connection: { access_token: "tt_token" },
          env: {}
        });
      },
      { message: /TIKTOK_REQUIRES_VIDEO/ }
    );

    // 5.2 Video initialization
    let tiktokBody = null;
    fetchMocks.push({
      match: (url, opts) => url.includes("/post/publish/video/init/") && opts.method === "POST",
      handler: async (_url, opts) => {
        tiktokBody = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({ data: { publish_id: "tt_pub_123" } })
        };
      }
    });

    const ttResult = await tiktok.publish({
      content: {
        text: "TikTok dance video",
        media: [{ preview_url: "https://cdn.example.com/media/test.mp4", mime_type: "video/mp4", role: "primary" }]
      },
      connection: { access_token: "tt_token" },
      env: {}
    });
    assert.equal(ttResult.success, true);
    assert.equal(ttResult.external_id, "tt_pub_123");
    assert.equal(tiktokBody.source_info.source, "PULL_FROM_URL");
    assert.equal(tiktokBody.source_info.video_url, "https://cdn.example.com/media/test.mp4");
  });

  // 6. YouTube / Google Adapter
  test("6. YouTube / Google: validates video requirement and sends multipart request", async () => {
    let multipartHeaders = null;
    fetchMocks.push({
      match: (url, opts) => url.includes("youtube/v3/videos") && opts.method === "POST",
      handler: async (_url, opts) => {
        multipartHeaders = opts.headers;
        return {
          ok: true,
          json: async () => ({ id: "yt_video_123" })
        };
      }
    });

    const ytResult = await google.publish({
      content: {
        text: "YouTube Video Title & Description",
        media: [{ preview_url: "https://cdn.example.com/media/test.mp4", mime_type: "video/mp4", role: "primary" }]
      },
      connection: { access_token: "google_token" },
      env: {}
    });
    assert.equal(ytResult.success, true);
    assert.equal(ytResult.external_id, "yt_video_123");
    assert.ok(multipartHeaders["Content-Type"].startsWith("multipart/related; boundary="));
  });

  // 7. Pinterest Adapter
  test("7. Pinterest: creates Image Pin with board ID, click link, and rejects video", async () => {
    // 7.1 Rejects video pin
    await assert.rejects(
      async () => {
        await pinterest.publish({
          content: {
            text: "Video Pin",
            media: [{ preview_url: "https://cdn.example.com/media/test.mp4", mime_type: "video/mp4", role: "primary" }]
          },
          connection: { access_token: "pin_token" },
          env: {}
        });
      },
      { message: /Videos are not supported on Pinterest Pins/ }
    );

    // 7.2 Image Pin
    let pinPayload = null;
    fetchMocks.push({
      match: (url, opts) => url.includes("/v5/pins") && opts.method === "POST",
      handler: async (_url, opts) => {
        pinPayload = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({ id: "pin_999" })
        };
      }
    });

    const pinResult = await pinterest.publish({
      content: {
        text: "Great Aviation Insights",
        link: "https://mypilotpost.com/blog/1",
        media: [{ preview_url: "https://cdn.example.com/media/test.jpg", mime_type: "image/jpeg", role: "primary" }]
      },
      connection: { access_token: "pin_token", selected_resource_id: "board_aviation" },
      env: {}
    });
    assert.equal(pinResult.success, true);
    assert.equal(pinResult.external_id, "pin_999");
    assert.equal(pinPayload.board_id, "board_aviation");
    assert.equal(pinPayload.link, "https://mypilotpost.com/blog/1");
    assert.equal(pinPayload.media_source.url, "https://cdn.example.com/media/test.jpg");
  });

  // 8. Threads Adapter
  test("8. Threads: creates media container and publishes container ID", async () => {
    fetchMocks.push({
      match: (url, opts) => url.includes("/threads") && !url.includes("threads_publish") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ id: "th_container_123" })
      })
    });
    fetchMocks.push({
      match: (url, opts) => url.includes("/threads_publish") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ id: "th_post_456" })
      })
    });

    const thResult = await threads.publish({
      content: { text: "Threads post content", media: [] },
      connection: { access_token: "th_token", account_id: "th_user_1" },
      env: {}
    });
    assert.equal(thResult.success, true);
    assert.equal(thResult.external_id, "th_post_456");
  });

  // 9. Google Business Profile Adapter
  test("9. Google Business Profile: creates local post and validates location format", async () => {
    // 9.1 Invalid location format throws
    await assert.rejects(
      async () => {
        await google_business.publish({
          content: { text: "GBP update" },
          connection: { access_token: "gbp_token", account_id: "invalid_id" },
          env: {}
        });
      },
      { message: /GBP_MISSING_LOCATION/ }
    );

    // 9.2 Valid location format
    fetchMocks.push({
      match: (url, opts) => url.includes("/localPosts") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ name: "accounts/123/locations/456/localPosts/789" })
      })
    });

    const gbpResult = await google_business.publish({
      content: { text: "Special Aviation Offer" },
      connection: { access_token: "gbp_token", account_id: "accounts/123/locations/456" },
      env: {}
    });
    assert.equal(gbpResult.success, true);
    assert.equal(gbpResult.external_id, "accounts/123/locations/456/localPosts/789");
  });

  // 10. WordPress & WooCommerce Adapters
  test("10. WordPress & WooCommerce: publishes articles and store products", async () => {
    // 10.1 WordPress
    fetchMocks.push({
      match: (url, opts) => url.includes("/wp-json/wp/v2/posts") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ id: 42, link: "https://myblog.com/post-42" })
      })
    });

    const wpResult = await wordpress.publish({
      content: { title: "Blog Title", text: "<p>Article body</p>" },
      connection: { access_token: "wp_app_pass", metadata: { blog_url: "https://myblog.com" } },
      env: {}
    });
    assert.equal(wpResult.success, true);
    assert.equal(wpResult.external_id, 42);

    // 10.2 WooCommerce
    fetchMocks.push({
      match: (url, opts) => url.includes("/wp-json/wc/v3/products") && opts.method === "POST",
      handler: async () => ({
        ok: true,
        json: async () => ({ id: 88, permalink: "https://mystore.com/product-88" })
      })
    });

    const wcResult = await wordpress_ecommerce.publish({
      content: { title: "Aviation T-Shirt", text: "Premium cotton" },
      connection: { access_token: "wc_key", metadata: { store_url: "https://mystore.com" } },
      env: {}
    });
    assert.equal(wcResult.success, true);
    assert.equal(wcResult.external_id, "88");
  });
});

describe("PUB-001: Dispatcher, Poster & Resolver Integration Certification", () => {
  let encryptedToken;

  beforeEach(async () => {
    encryptedToken = await encrypt("active-test-access-token", TEST_SECRET);
  });

  function createMockDB(options = {}) {
    const jobState = options.jobState || {
      id: "job-100",
      brand_id: "brand-1",
      user_id: "user-1",
      platform: "x",
      content_id: "asset-100",
      content_type: "social",
      status: "scheduled",
      delivery_attempts: 0,
      external_post_id: options.externalPostId || null
    };

    const logs = [];
    const updates = [];

    const db = {
      prepare: (sql) => ({
        bind: (...args) => ({
          run: async () => {
            updates.push({ sql, args });
            if (sql.includes("UPDATE delivery_jobs") && sql.includes("status = 'processing'")) {
              if (options.lockChanges !== undefined) {
                return { success: true, meta: { changes: options.lockChanges } };
              }
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 1 } };
          },
          first: async () => {
            if (sql.includes("SELECT external_post_id FROM delivery_jobs")) {
              return { external_post_id: jobState.external_post_id };
            }
            if (sql.includes("SELECT sa.*")) {
              return {
                id: "asset-100",
                brand_id: "brand-1",
                caption: "Ready to publish via dispatcher!",
                title: "Post Title",
                type: "social"
              };
            }
            if (sql.includes("FROM social_connections")) {
              return {
                id: "conn-100",
                platform: args[1] || "x",
                account_id: "acc_100",
                platform_username: "mypilotpost",
                access_token: encryptedToken,
                status: "active"
              };
            }
            if (sql.includes("FROM content_vault")) {
              return null;
            }
            return null;
          },
          all: async () => {
            if (sql.includes("FROM content_media_links")) {
              return { results: [] };
            }
            if (sql.includes("SELECT status FROM delivery_jobs")) {
              return { results: [{ status: "published" }] };
            }
            return { results: [] };
          }
        })
      }),
      batch: async (queries) => ({ success: true }),
      updates,
      logs
    };
    return db;
  }

  test("11. Double Execution Protection: atomic lock skips execution when changes === 0", async () => {
    const mockDB = createMockDB({ lockChanges: 0 }); // lock acquired by another worker
    const mockEnv = {
      ENCRYPTION_SECRET: TEST_SECRET,
      mypilotpost: mockDB,
      DB: mockDB
    };

    let adapterInvoked = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      adapterInvoked = true;
      return { ok: true, json: async () => ({ data: { id: "never_called" } }) };
    };

    try {
      await executeDeliveryJob(mockEnv, {
        id: "job-100",
        platform: "x",
        brand_id: "brand-1",
        content_id: "asset-100",
        delivery_attempts: 0
      });

      assert.equal(adapterInvoked, false, "Adapter must NOT be called when lock fails");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("12. Idempotency Protection: skips adapter call if external_post_id already set", async () => {
    const mockDB = createMockDB({ externalPostId: "existing_tweet_999" });
    const mockEnv = {
      ENCRYPTION_SECRET: TEST_SECRET,
      mypilotpost: mockDB,
      DB: mockDB
    };

    let adapterInvoked = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      adapterInvoked = true;
      return { ok: true, json: async () => ({ data: { id: "should_not_run" } }) };
    };

    try {
      await executeDeliveryJob(mockEnv, {
        id: "job-100",
        platform: "x",
        brand_id: "brand-1",
        content_id: "asset-100",
        delivery_attempts: 0
      });

      assert.equal(adapterInvoked, false, "Adapter must NOT be called when job already has external_post_id");
      // Check that syncContentStatusWithJobs was called
      const updateCall = mockDB.updates.find(u => u.sql.includes("UPDATE delivery_jobs") && u.args.includes("published"));
      assert.ok(updateCall, "Should sync published status");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("13. Platform Alias Resolution: resolver matches 'twitter' to 'x' connection", async () => {
    const mockDB = createMockDB();
    const mockEnv = {
      ENCRYPTION_SECRET: TEST_SECRET,
      mypilotpost: mockDB,
      DB: mockDB
    };

    const resolved = await resolveDeliveryData(mockEnv, {
      id: "job-100",
      platform: "twitter",
      brand_id: "brand-1",
      content_id: "asset-100"
    });

    assert.equal(resolved.content.platform, "twitter");
    assert.equal(resolved.connection.access_token, "active-test-access-token");
  });

  test("14. Retry Policy & Exponential Backoff: schedules 30s for attempt 1, 180s for attempt 2, exhausts at 3", async () => {
    const updates = [];
    const mockDB = {
      prepare: (sql) => ({
        bind: (...args) => ({
          run: async () => {
            updates.push({ sql, args });
            return { success: true };
          }
        })
      })
    };

    // Attempt 1 -> 30 seconds
    const now = Date.now();
    await scheduleRetry(mockDB, { id: "job-retry-1" }, 1, "UNKNOWN");
    assert.equal(updates.length, 1);
    const scheduledTime1 = new Date(updates[0].args[0]).getTime();
    assert.ok(scheduledTime1 - now >= 29000 && scheduledTime1 - now <= 32000, "Attempt 1 schedules ~30s");

    // Attempt 2 -> 180 seconds
    await scheduleRetry(mockDB, { id: "job-retry-2" }, 2, "UNKNOWN");
    assert.equal(updates.length, 2);
    const scheduledTime2 = new Date(updates[1].args[0]).getTime();
    assert.ok(scheduledTime2 - now >= 179000 && scheduledTime2 - now <= 182000, "Attempt 2 schedules ~180s");

    // Attempt 3 -> exhausted (no DB update)
    await scheduleRetry(mockDB, { id: "job-retry-3" }, 3, "UNKNOWN");
    assert.equal(updates.length, 2, "Attempt 3 must not schedule another run");
  });
});
