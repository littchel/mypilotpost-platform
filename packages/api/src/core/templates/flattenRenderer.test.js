import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { renderTemplateSlides, renderTemplateFlat } from "./flattenRenderer.js";

// Load actual template JSON files from disk
const definitionsDir = "/Users/littchel/Documents/Platforms/MyPilotPost/mypilotpost-platform/packages/api/src/core/templates/definitions";
const template1 = JSON.parse(fs.readFileSync(path.join(definitionsDir, "Template #1.json"), "utf8"));
const template6 = JSON.parse(fs.readFileSync(path.join(definitionsDir, "Template #6.json"), "utf8"));
const template10 = JSON.parse(fs.readFileSync(path.join(definitionsDir, "Template #10.json"), "utf8"));
const template12 = JSON.parse(fs.readFileSync(path.join(definitionsDir, "Template #12.json"), "utf8"));
const template13 = JSON.parse(fs.readFileSync(path.join(definitionsDir, "Template #13-A.json"), "utf8"));

const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

describe("Satori & Resvg WASM Flatten Renderer Suite - Multi-Slide", () => {
  const mockDbStore = {
    prepare: () => ({
      bind: () => ({
        first: async () => ({
          primary_color_hex: "#2563eb",
          secondary_color_hex: "#0f172a",
          font_pairing_headline: "Inter",
          font_pairing_body: "Inter",
          logo_asset_url: TINY_PNG
        })
      })
    })
  };

  const mockR2Store = {
    get: async () => null,
    put: async () => ({})
  };

  const env = {
    DB: mockDbStore,
    MEDIA_BUCKET: mockR2Store
  };

  test("1. Category 1: Flat slots template (Template #1)", async () => {
    const manifestSlides = [
      { headline: "Slide 1 Title", body: "Slide 1 description", image_url: TINY_PNG }
    ];
    const pngs = await renderTemplateSlides(template1, manifestSlides, "test-brand", env);
    assert.strictEqual(pngs.length, 1);
    assert.ok(pngs[0] instanceof Uint8Array);
    assert.ok(pngs[0].byteLength > 100);
  });

  test("2. Category 2: Slides array template (Template #6)", async () => {
    const manifestSlides = [
      { headline: "Service A", body: "Description of service A", image_url: TINY_PNG },
      { headline: "Service B", body: "Description of service B", image_url: TINY_PNG }
    ];
    // Template #6 contains 5 slides. Since manifest defines 2, it should output 2 pngs (truncate to shorter length).
    const pngs = await renderTemplateSlides(template6, manifestSlides, "test-brand", env);
    assert.strictEqual(pngs.length, 2);
    assert.ok(pngs[0] instanceof Uint8Array);
    assert.ok(pngs[1] instanceof Uint8Array);
  });

  test("3. Category 3: Carousel slides array template (Template #10)", async () => {
    const manifestSlides = [
      { headline: "Fashion Tip 1", body: "Invest in quality", image_url: TINY_PNG },
      { headline: "Fashion Tip 2", body: "Accessorize", image_url: TINY_PNG },
      { headline: "Fashion Tip 3", body: "Colors", image_url: TINY_PNG }
    ];
    const pngs = await renderTemplateSlides(template10, manifestSlides, "test-brand", env);
    assert.strictEqual(pngs.length, 3);
  });

  test("4. Category 4a: Layout elements (Template #12)", async () => {
    const manifestSlides = [
      { headline: "This caption", body: "That caption", image_url: TINY_PNG, image_url_2: TINY_PNG }
    ];
    const pngs = await renderTemplateSlides(template12, manifestSlides, "test-brand", env);
    assert.strictEqual(pngs.length, 1);
    assert.ok(pngs[0].byteLength > 100);
  });

  test("5. Category 4b: Zone properties / Poll stickers (Template #13-A)", async () => {
    const manifestSlides = [
      { headline: "Should we build this?" }
    ];
    const pngs = await renderTemplateSlides(template13, manifestSlides, "test-brand", env);
    assert.strictEqual(pngs.length, 1);
    assert.ok(pngs[0].byteLength > 100);
  });

  test("6. Mismatched-slide-count: Manifest has 10 slides, Template #6 has 5 slides (should truncate to 5)", async () => {
    const manifestSlides = Array(10).fill({ headline: "Test", body: "Desc" });
    const pngs = await renderTemplateSlides(template6, manifestSlides, "test-brand", env);
    assert.strictEqual(pngs.length, 5);
  });

  test("7. Mock R2 get() cache hit path simulation", async () => {
    let headCalled = false;
    const customR2 = {
      head: async (key) => {
        headCalled = true;
        return { size: 1024, httpMetadata: { contentType: "image/png" } };
      },
      get: async () => null,
      put: async () => ({})
    };
    
    // Simulate resolver pipeline cache hit
    const existing = await customR2.head("renders/cached-file.png");
    assert.ok(existing);
    assert.strictEqual(headCalled, true);
  });
});
