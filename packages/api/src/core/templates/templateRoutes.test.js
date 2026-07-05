import { test, describe } from "node:test";
import assert from "node:assert";
import { getTemplateWithVariant } from "./templateRoutes.js";

// Mock environment setup
const createMockEnv = () => {
  const redisStore = new Map();
  return {
    REDIS_CLIENT: {
      store: redisStore,
      get: async function (key) {
        return redisStore.get(key) || null;
      },
      setEx: async function (key, ttl, val) {
        redisStore.set(key, val);
      }
    }
  };
};

describe("GET /api/customer/templates/:template_id/:variant? Endpoint Suite", () => {
  const auth = { brand_id: "test-brand-123" };

  test("1. Successfully loads a core template schema without a variant", async () => {
    const env = createMockEnv();
    const req = new Request("http://localhost/api/customer/templates/hero_headline_feed");

    const res = await getTemplateWithVariant(req, env, auth);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.template_id, "hero_headline_feed");
    assert.equal(body.format, "feed_post");
    assert.ok(body.slides);
  });

  test("2. Successfully loads and merges a core template with variant overrides", async () => {
    const env = createMockEnv();
    const req = new Request("http://localhost/api/customer/templates/hero_headline_feed/B");

    const res = await getTemplateWithVariant(req, env, auth);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.template_id, "hero_headline_feed");
    assert.equal(body.variant_id, "B");
    assert.equal(body.variant, "camera_viewfinder_ui");
    assert.ok(body.interface_overlays);
  });

  test("3. Fails with 401 if unauthorized (missing brand_id)", async () => {
    const env = createMockEnv();
    const req = new Request("http://localhost/api/customer/templates/hero_headline_feed");

    const res = await getTemplateWithVariant(req, env, {});
    assert.equal(res.status, 401);
  });

  test("4. Returns 404 for a missing core template ID", async () => {
    const env = createMockEnv();
    const req = new Request("http://localhost/api/customer/templates/non_existent_template_id");

    const res = await getTemplateWithVariant(req, env, auth);
    assert.equal(res.status, 404);
  });

  test("5. Returns 404 for a missing variant ID", async () => {
    const env = createMockEnv();
    const req = new Request("http://localhost/api/customer/templates/hero_headline_feed/Z");

    const res = await getTemplateWithVariant(req, env, auth);
    assert.equal(res.status, 404);
  });

  test("6. Returns 500 for a validation failure schema", async () => {
    const env = createMockEnv();
    const req = new Request("http://localhost/api/customer/templates/invalid_mock_template");

    // Temporarily mock getTemplate inside templateStore (since it imports dynamically, we can inject a bad cache entry)
    await env.REDIS_CLIENT.setEx(
      "template:invalid_mock_template",
      3600,
      JSON.stringify({
        template_id: "" // trigger validation error
      })
    );

    const res = await getTemplateWithVariant(req, env, auth);
    assert.equal(res.status, 500);

    const body = await res.json();
    assert.ok(body.message.toLowerCase().includes("validation"));
  });
});
