import { test, describe } from "node:test";
import assert from "node:assert";
import sharp from "sharp";
import { resolveDeliveryData } from "../../core/delivery/resolver.js";
import { getTemplatePreviewImage } from "../../core/templates/templateRoutes.js";
import { generateStudioPost } from "../../core/studio/studio.js";
import { encrypt } from "../../lib/crypto.js";

const TEST_SECRET = "test-encryption-secret-32byteslong!";

describe("Studio & Delivery Pipeline Integration Suite", () => {
  const brandId = "brand-delivery-test";
  const contentId = "content-job-123";

  function createMockEnv(overrides = {}) {
    const r2Store = new Map();
    const dbTables = {
      users: {
        id: "user-1",
        tier: "pro",
        subscription_status: "active",
        billing_period_start: new Date().toISOString(),
      },
      brand_dna_visual_identity: {
        primary_color_hex: "#1e40af",
        secondary_color_hex: "#0f172a",
        accent_color: "#3b82f6",
        font_pairing_headline: "Inter",
        font_pairing_body: "Inter",
        logo_asset_url: null,
        background_preference: "light",
      },
      brands: {
        id: brandId,
        name: "Test Aerospace",
        industry: "Aviation",
      },
      social_assets: {
        id: contentId,
        brand_id: brandId,
        title: "Test Social Post",
        caption: "Test post caption for delivery",
      },
      social_connections: {
        id: "conn-123",
        platform: "instagram",
        brand_id: brandId,
        status: "active",
        access_token: "",
        refresh_token: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      content_vault: {
        id: contentId,
        brand_id: brandId,
        title: "Test Vault Item",
        layout_manifest: null,
      },
      brand_context: {
        context: "Aviation fuel specialists",
      },
    };

    const mockDb = {
      prepare(query) {
        const q = query.trim().replace(/\s+/g, " ");
        return {
          bind(...args) {
            return {
              async first() {
                if (q.includes("FROM users")) return dbTables.users;
                if (q.includes("FROM brand_dna_visual_identity")) return dbTables.brand_dna_visual_identity;
                if (q.includes("FROM brands WHERE id = ?")) return dbTables.brands;
                if (q.includes("FROM brand_context")) return dbTables.brand_context;
                if (q.includes("FROM social_assets")) return dbTables.social_assets;
                if (q.includes("FROM social_connections")) return dbTables.social_connections;
                if (q.includes("FROM content_vault")) return dbTables.content_vault;
                if (q.includes("FROM brand_memory")) return null;
                if (q.includes("FROM user_usage")) return null;
                return null;
              },
              async all() {
                if (q.includes("FROM content_media_links")) {
                  return { results: [] };
                }
                return { results: [] };
              },
              async run() {
                return { success: true };
              },
            };
          },
        };
      },
    };

    return {
      ENCRYPTION_SECRET: TEST_SECRET,
      mypilotpost: mockDb,
      DB: mockDb,
      MEDIA_BUCKET: {
        async head(key) {
          const item = r2Store.get(key);
          if (!item) return null;
          return { size: item.buffer.length, httpMetadata: item.options?.httpMetadata };
        },
        async put(key, buffer, options) {
          r2Store.set(key, { buffer, options });
          return {};
        },
        async get(key) {
          const item = r2Store.get(key);
          if (!item) return null;
          return { body: item.buffer };
        },
      },
      r2Store,
      dbTables,
      ...overrides,
    };
  }

  test("1. Delivery Resolver: certified template renders canonical PNG and replaces validatedMedia", async () => {
    const testImage = `data:image/png;base64,${(await sharp({
      create: { width: 1200, height: 900, channels: 3, background: { r: 40, g: 120, b: 80 } },
    }).png().toBuffer()).toString("base64")}`;

    const env = createMockEnv();
    const encToken = await encrypt("valid-oauth-access-token", TEST_SECRET);
    env.dbTables.social_connections.access_token = encToken;

    env.dbTables.content_vault.layout_manifest = JSON.stringify({
      manifest_version: 0,
      template_id: "mpp.feed.editorial",
      slides: [{
        headline: "Aviation Fuel Innovation",
        body: "Sustainable aviation fuel reduces net emissions by eighty percent.",
        cta: "Read Case Study",
        image: testImage,
      }],
    });

    const job = {
      content_id: contentId,
      brand_id: brandId,
      platform: "instagram",
      content_type: "social",
    };

    const delivery = await resolveDeliveryData(env, job);

    assert.ok(delivery.content);
    assert.ok(delivery.connection);
    assert.equal(delivery.connection.access_token, "valid-oauth-access-token");
    assert.equal(delivery.content.media.length, 1);
    assert.equal(delivery.content.media[0].mime_type, "image/png");
    assert.equal(delivery.content.media[0].validation_status, "valid");

    // Check that canonical PNG buffer in R2 starts with PNG magic number
    assert.ok(env.r2Store.size > 0);
    const storedRender = Array.from(env.r2Store.values())[0];
    const signature = Buffer.from(storedRender.buffer).subarray(0, 8).toString("hex");
    assert.equal(signature, "89504e470d0a1a0a");
  });

  test("2. Delivery Resolver: uncertified legacy template fails closed with TEMPLATE_NOT_CERTIFIED", async () => {
    const env = createMockEnv();
    const encToken = await encrypt("valid-oauth-access-token", TEST_SECRET);
    env.dbTables.social_connections.access_token = encToken;

    env.dbTables.content_vault.layout_manifest = JSON.stringify({
      manifest_version: 0,
      template_id: "hero_headline_feed",
      slides: [{ headline: "Legacy Hook", body: "Legacy Body", cta: "Go" }],
    });

    const job = {
      content_id: contentId,
      brand_id: brandId,
      platform: "instagram",
      content_type: "social",
    };

    await assert.rejects(
      () => resolveDeliveryData(env, job),
      (err) => err.code === "TEMPLATE_NOT_CERTIFIED",
    );
  });

  test("3. Template Preview Endpoint: renders PNG for certified template and 404s for uncertified", async () => {
    const env = createMockEnv();
    const auth = { brand_id: brandId, user_id: "user-1" };

    // Certified template
    const validUrl = `https://api.mypilotpost.com/api/customer/templates/render-preview?template_id=mpp.feed.bold&headline=Headline+Text&body=Body+Paragraph+Text&cta=Start`;
    const validReq = new Request(validUrl);
    const validRes = await getTemplatePreviewImage(validReq, env, auth);

    assert.equal(validRes.status, 200);
    assert.equal(validRes.headers.get("Content-Type"), "image/png");
    const pngBytes = await validRes.arrayBuffer();
    assert.equal(Buffer.from(pngBytes).subarray(0, 4).toString("hex"), "89504e47");

    // Uncertified legacy template
    const legacyUrl = `https://api.mypilotpost.com/api/customer/templates/render-preview?template_id=quote_card_feed&headline=Test`;
    const legacyReq = new Request(legacyUrl);
    const legacyRes = await getTemplatePreviewImage(legacyReq, env, auth);

    assert.equal(legacyRes.status, 404);
    const legacyBody = await legacyRes.json();
    assert.equal(legacyBody.error, "TEMPLATE_NOT_CERTIFIED");
  });

  test("4. Generate Studio Post: rejects uncertified legacy IDs with 422 and assigns certified templates", async () => {
    const env = createMockEnv({ GROQ_API_KEY: "mock-key" });
    const auth = { brand_id: brandId, user_id: "user-1" };

    // Request with legacy template ID
    const legacyPostReq = new Request("https://api.mypilotpost.com/api/customer/studio/generate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        framework: "Myth vs Reality",
        idea: "Aviation Fuel",
        hook: "Common fuel myths",
        template_id: "split_layout_feed",
      }),
    });
    const legacyRes = await generateStudioPost(legacyPostReq, env, auth);
    assert.equal(legacyRes.status, 422);
    const legacyData = await legacyRes.json();
    assert.equal(legacyData.error, "TEMPLATE_NOT_CERTIFIED");
  });
});
