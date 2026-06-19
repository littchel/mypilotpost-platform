/**
 * Verification Script: Instagram Hardening, Media Validation & Pre-flight
 * File: packages/api/verification/test-instagram-preflight.js
 */

import { validateMediaForPublishing, preflightInstagramPublish } from "../src/core/delivery/validation.js";

async function runTests() {
  console.log("🚀 STARTING INSTAGRAM PRE-FLIGHT & MEDIA VALIDATION TEST SUITE\n");

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

  // =========================================================================
  // SCENARIO 1: Media Validation Service
  // =========================================================================
  console.log("Scenario 1: Media Validation Service");

  // 1.1 Direct R2 media object bypass validation
  const mockR2Bucket = {
    head: async (key) => {
      if (key === "brands/b4c053d9-8dd9-4e9e-9c06-946ee45af99e/media/test-img.jpg") {
        return {
          size: 5 * 1024 * 1024, // 5MB
          httpMetadata: { contentType: "image/jpeg" }
        };
      }
      return null;
    }
  };
  const mockEnv = { MEDIA_BUCKET: mockR2Bucket };

  const validR2Media = {
    provider: "direct",
    external_id: "brands/b4c053d9-8dd9-4e9e-9c06-946ee45af99e/media/test-img.jpg",
    preview_url: "https://api.mypilotpost.com/api/media/file/brands%2Fb4c053d9-8dd9-4e9e-9c06-946ee45af99e%2Fmedia%2Ftest-img.jpg"
  };

  const validationR2 = await validateMediaForPublishing(validR2Media, mockEnv);
  assert(validationR2.valid === true, "Direct R2 media should validate as valid");
  assert(validationR2.contentType === "image/jpeg", "Direct R2 media content type should be resolved from R2 headers");
  assert(validationR2.size === 5242880, "Direct R2 media size should be resolved from R2 headers");

  // 1.2 Direct R2 missing object should fail validation
  const invalidR2Media = {
    provider: "direct",
    external_id: "brands/b4c053d9-8dd9-4e9e-9c06-946ee45af99e/media/missing-img.jpg",
    preview_url: "https://api.mypilotpost.com/api/media/file/brands%2Fb4c053d9-8dd9-4e9e-9c06-946ee45af99e%2Fmedia%2Fmissing-img.jpg"
  };
  const validationR2Missing = await validateMediaForPublishing(invalidR2Media, mockEnv);
  assert(validationR2Missing.valid === false, "Missing R2 media should fail validation");
  assert(validationR2Missing.error === "MEDIA_R2_OBJECT_NOT_FOUND", "Should return MEDIA_R2_OBJECT_NOT_FOUND error code");

  // =========================================================================
  // SCENARIO 2: Instagram Pre-flight validation rules
  // =========================================================================
  console.log("\nScenario 2: Instagram Pre-flight validation rules");

  const mockConnection = {
    access_token: "mock-token-xyz",
    account_id: "17841445044229677"
  };

  // 2.1 Missing media files should reject scheduling
  const contentNoMedia = {
    text: "Some caption",
    media: []
  };
  try {
    await preflightInstagramPublish({ connection: mockConnection, content: contentNoMedia, env: mockEnv });
    assert(false, "Should have thrown error on missing media");
  } catch (err) {
    assert(err.message.startsWith("INSTAGRAM_REQUIRES_MEDIA"), "Preflight should throw error if no media attached");
  }

  // 2.2 Restricted Instagram Account should reject scheduling
  const contentValidMedia = {
    text: "Relocation solution caption",
    media: [validR2Media]
  };

  // Mock global fetch for API calls to graph.facebook.com
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("17841445044229677")) {
      // Return OAuthException Code 25 restricted account mock response
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          error: {
            message: "User access is restricted",
            type: "OAuthException",
            code: 25,
            error_subcode: 2207050,
            is_transient: false
          }
        })
      };
    }
    return { ok: true, status: 200, headers: new Map() };
  };

  try {
    await preflightInstagramPublish({ connection: mockConnection, content: contentValidMedia, env: mockEnv });
    assert(false, "Should have thrown ACCOUNT_RESTRICTED");
  } catch (err) {
    assert(err.message.startsWith("ACCOUNT_RESTRICTED"), "Preflight should detect and throw ACCOUNT_RESTRICTED on restricted Meta accounts");
  }

  // 2.3 Expired token check
  globalThis.fetch = async (url) => {
    if (url.includes("17841445044229677")) {
      return {
        ok: false,
        status: 401,
        text: async () => JSON.stringify({
          error: {
            message: "The access token has expired",
            type: "OAuthException",
            code: 190
          }
        })
      };
    }
  };
  try {
    await preflightInstagramPublish({ connection: mockConnection, content: contentValidMedia, env: mockEnv });
    assert(false, "Should have thrown TOKEN_EXPIRED");
  } catch (err) {
    assert(err.message.startsWith("TOKEN_EXPIRED"), "Preflight should detect and throw TOKEN_EXPIRED on expired tokens");
  }

  // 2.4 Media size limits
  // Mock R2 to return a 15MB file (exceeds 8MB image limit)
  mockR2Bucket.head = async () => ({
    size: 15 * 1024 * 1024,
    httpMetadata: { contentType: "image/jpeg" }
  });
  globalThis.fetch = async () => ({
    ok: true,
    status: 200
  });

  try {
    await preflightInstagramPublish({ connection: mockConnection, content: contentValidMedia, env: mockEnv });
    assert(false, "Should have thrown MEDIA_INVALID due to size limits");
  } catch (err) {
    assert(err.message.includes("exceeds Instagram limit"), "Preflight should reject images larger than 8MB");
  }

  // 2.5 WebP support
  mockR2Bucket.head = async () => ({
    size: 2 * 1024 * 1024,
    httpMetadata: { contentType: "image/webp" }
  });
  try {
    await preflightInstagramPublish({ connection: mockConnection, content: contentValidMedia, env: mockEnv });
    assert(true, "Preflight should accept WebP images");
  } catch (err) {
    assert(false, `Preflight rejected WebP image: ${err.message}`);
  }

  // 2.6 Image Aspect Ratio
  const contentBadAspectRatio = {
    text: "Caption",
    media: [{
      ...validR2Media,
      width: 100,
      height: 400
    }]
  };
  try {
    await preflightInstagramPublish({ connection: mockConnection, content: contentBadAspectRatio, env: mockEnv });
    assert(false, "Should have thrown aspect ratio error");
  } catch (err) {
    assert(err.message.includes("aspect ratio must be between"), "Preflight should validate and reject bad image aspect ratio");
  }

  // 2.7 Video Duration Check (too short)
  const videoMediaShort = {
    provider: "direct",
    external_id: "test-video.mp4",
    preview_url: "https://api.mypilotpost.com/test-video.mp4",
    duration_seconds: 2,
    width: 640,
    height: 640
  };
  mockR2Bucket.head = async () => ({
    size: 10 * 1024 * 1024,
    httpMetadata: { contentType: "video/mp4" }
  });
  try {
    await preflightInstagramPublish({
      connection: mockConnection,
      content: { text: "Caption", media: [videoMediaShort] },
      env: mockEnv
    });
    assert(false, "Should have rejected too short video duration");
  } catch (err) {
    assert(err.message.includes("duration must be between"), "Preflight should reject videos shorter than 3s");
  }

  // 2.8 Video Duration Check (too long)
  const videoMediaLong = {
    ...videoMediaShort,
    duration_seconds: 120
  };
  try {
    await preflightInstagramPublish({
      connection: mockConnection,
      content: { text: "Caption", media: [videoMediaLong] },
      env: mockEnv
    });
    assert(false, "Should have rejected too long video duration");
  } catch (err) {
    assert(err.message.includes("duration must be between"), "Preflight should reject videos longer than 90s");
  }

  // 2.9 Video Duration (valid) & Aspect Ratio
  const videoMediaValid = {
    ...videoMediaShort,
    duration_seconds: 15
  };
  try {
    await preflightInstagramPublish({
      connection: mockConnection,
      content: { text: "Caption", media: [videoMediaValid] },
      env: mockEnv
    });
    assert(true, "Preflight should pass valid video with correct duration and aspect ratio");
  } catch (err) {
    assert(false, `Preflight failed on valid video: ${err.message}`);
  }

  // 2.10 Carousel Multi-Item Validation
  const carouselContent = {
    text: "Caption",
    media: [
      { ...validR2Media, width: 600, height: 600 },
      { ...validR2Media, width: 100, height: 400 } // invalid aspect ratio
    ]
  };
  mockR2Bucket.head = async () => ({
    size: 2 * 1024 * 1024,
    httpMetadata: { contentType: "image/jpeg" }
  });
  try {
    await preflightInstagramPublish({ connection: mockConnection, content: carouselContent, env: mockEnv });
    assert(false, "Should have failed carousel validation due to one invalid item");
  } catch (err) {
    assert(err.message.includes("aspect ratio must be between"), "Preflight should validate all items in a carousel");
  }

  // Restore fetch
  globalThis.fetch = originalFetch;

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("✅ ALL TESTS PASSED SUCCESSFULLY");
  }
}

runTests();
