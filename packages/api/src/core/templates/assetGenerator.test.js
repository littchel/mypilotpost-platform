import { test, describe } from "node:test";
import assert from "node:assert";
import { generateFinalAsset } from "./assetGenerator.js";

// Mock R2 environment helper
const createMockEnv = () => {
  const uploads = [];
  const redisStore = new Map();
  
  // Pre-seed mock template with format: 'carousel'
  redisStore.set("template:carousel_list_005", JSON.stringify({
    template_id: "carousel_list_005",
    format: "carousel",
    dimensions: { width: 1080, height: 1350 },
    slides: [
      { slot_id: "headline_slot", components: [] },
      { slot_id: "call_to_action", components: [] }
    ]
  }));

  redisStore.set("template:carousel_list_005-B", JSON.stringify({
    template_id: "carousel_list_005",
    variant_id: "B",
    interface_overlays: {}
  }));

  return {
    BASE_URL: "https://api.mypilotpost.com",
    MEDIA_BUCKET: {
      get: async () => null,
      put: async (key, buffer, options) => {
        uploads.push({ key, buffer, options });
      }
    },
    REDIS_CLIENT: {
      get: async (key) => redisStore.get(key) || null,
      setEx: async (key, ttl, val) => {
        redisStore.set(key, val);
      }
    },
    uploads
  };
};

describe("Asset Generator (generateFinalAsset) Unit Suite", () => {
  const brandId = "brand-123";
  const jobId = "job-456";

  const sampleManifest = {
    template_id: "carousel_list_005",
    template_variant: "B",
    brand_overrides: {
      primary_color: "#111111",
      secondary_color: "#eeeeee",
      font_stack: "Outfit, sans-serif",
      logo_url: "https://cdn.example.com/logo.png"
    },
    slides: [
      { slot_id: "headline_slot", text: "Empowering AI Workflows" },
      { slot_id: "call_to_action", text: "Start Free Trial" }
    ]
  };

  test("1. Successful high-resolution carousel parallel asset generation", async () => {
    const env = createMockEnv();
    
    // Mock renderer returning dummy buffer
    const mockRenderer = async (schema, data, brandVars, slideIndex, dimensions) => {
      assert.ok(schema);
      assert.ok(dimensions.width);
      assert.ok(dimensions.height);
      return Buffer.from(`mock-render-slide-${slideIndex}`);
    };

    const result = await generateFinalAsset(sampleManifest, brandId, "instagram", jobId, env, mockRenderer);
    
    assert.equal(result.format, "carousel");
    assert.equal(result.asset_urls.length, 2);
    assert.equal(result.asset_urls[0], `https://api.mypilotpost.com/api/media/file/brands/${brandId}/deliveries/${jobId}/0.png`);
    assert.equal(result.asset_urls[1], `https://api.mypilotpost.com/api/media/file/brands/${brandId}/deliveries/${jobId}/1.png`);
    
    assert.equal(env.uploads.length, 2);
    assert.equal(env.uploads[0].key, `brands/${brandId}/deliveries/${jobId}/0.png`);
    assert.equal(env.uploads[0].options.httpMetadata.contentType, "image/png");
    assert.equal(env.uploads[0].buffer.toString(), "mock-render-slide-0");
  });

  test("2. Successful retry logic on first attempt failure", async () => {
    const env = createMockEnv();
    let attempts = 0;

    const mockRenderer = async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error("Temporary Chromium crash");
      }
      return Buffer.from("recovered-render-buffer");
    };

    // Override slide manifest to a single slide for fast execution
    const singleSlideManifest = {
      ...sampleManifest,
      slides: [{ slot_id: "headline_slot", text: "Single Slide Title" }]
    };

    const result = await generateFinalAsset(singleSlideManifest, brandId, "facebook", jobId, env, mockRenderer);
    
    assert.equal(result.asset_urls.length, 1);
    assert.equal(attempts, 2); // 1st failed, 2nd succeeded
    assert.equal(env.uploads[0].buffer.toString(), "recovered-render-buffer");
  });

  test("3. Fallback to SVG generation when all render attempts fail", async () => {
    const env = createMockEnv();
    let attempts = 0;

    const mockRenderer = async () => {
      attempts++;
      throw new Error("Chromium path not found or execution timeout");
    };

    const singleSlideManifest = {
      ...sampleManifest,
      slides: [{ slot_id: "headline_slot", text: "Fallback Post Title" }]
    };

    const result = await generateFinalAsset(singleSlideManifest, brandId, "linkedin", jobId, env, mockRenderer);
    
    assert.equal(result.asset_urls.length, 1);
    assert.equal(attempts, 2); // Attempted twice, then gave up and fallback to SVG
    
    // Check that key was generated with .svg extension
    assert.equal(env.uploads[0].key, `brands/${brandId}/deliveries/${jobId}/0.svg`);
    assert.equal(env.uploads[0].options.httpMetadata.contentType, "image/svg+xml");
    
    const svgContent = env.uploads[0].buffer.toString();
    assert.ok(svgContent.includes("<svg"));
    assert.ok(svgContent.includes("Fallback Post Title"));
  });
});
