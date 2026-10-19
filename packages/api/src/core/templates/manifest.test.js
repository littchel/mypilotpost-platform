import { test, describe } from "node:test";
import assert from "node:assert";
import { validateLayoutManifest, validateManifestOrThrow } from "./manifest.js";

function validV1(overrides = {}) {
  return {
    manifest_version: 1,
    template_id: "mpp.feed.editorial",
    template_variant: null,
    brand_overrides: {
      primary_color: "#1A73E8",
      secondary_color: "#F5F5F5",
      font_stack: "Inter, sans-serif",
      logo_url: "https://example.com/logo.png",
    },
    slides: [{ headline: "A clear headline", body: "One sentence that fits the slot.", cta: "Book a call" }],
    ...overrides,
  };
}

describe("layout manifest validation", () => {
  test("valid v1 manifest passes without media when requireMedia is false", () => {
    const result = validateLayoutManifest(validV1());
    assert.equal(result.ok, true);
    assert.equal(result.template.id, "mpp.feed.editorial");
  });

  test("unknown template_id is rejected, never substituted", () => {
    const result = validateLayoutManifest(validV1({ template_id: "mpp.feed.unknown" }));
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, "TEMPLATE_NOT_CERTIFIED");
    assert.equal(result.template, undefined);
  });

  test("legacy template_id is rejected", () => {
    const result = validateLayoutManifest(validV1({ template_id: "tpl_feed_generic_default" }));
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, "TEMPLATE_NOT_CERTIFIED");
  });

  test("manifest_version other than 1 is invalid", () => {
    const result = validateLayoutManifest(validV1({ manifest_version: 2 }));
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, "TEMPLATE_INVALID_SPECIFICATION");
    assert.equal(result.errors[0].field, "manifest_version");
  });

  test("v1 manifest with a variant letter is invalid", () => {
    const result = validateLayoutManifest(validV1({ template_variant: "A" }));
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, "TEMPLATE_INVALID_SPECIFICATION");
    assert.equal(result.errors[0].field, "template_variant");
  });

  test("slide count must match the template", () => {
    const result = validateLayoutManifest(validV1({ slides: [] }));
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, "TEMPLATE_INVALID_SPECIFICATION");
    assert.equal(result.errors[0].reason, "slide_count_mismatch");
  });

  test("content overflow is reported per slot", () => {
    const result = validateLayoutManifest(validV1({
      slides: [{ headline: "word ".repeat(40), body: "ok", cta: "Go" }],
    }));
    assert.equal(result.ok, false);
    const overflow = result.errors.find((e) => e.code === "CONTENT_EXCEEDS_CAPACITY");
    assert.ok(overflow);
    assert.equal(overflow.slotId, "headline");
    assert.equal(overflow.reason, "character_capacity");
    assert.equal(overflow.slide, 0);
  });

  test("unknown slide content keys are rejected", () => {
    const result = validateLayoutManifest(validV1({
      slides: [{ headline: "A clear headline", subtitle: "not a slot" }],
    }));
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, "TEMPLATE_INVALID_SPECIFICATION");
    assert.equal(result.errors[0].reason, "slide_content_key_unknown");
    assert.equal(result.errors[0].field, "subtitle");
  });

  test("brand_overrides colors must be hex", () => {
    const result = validateLayoutManifest(validV1({
      brand_overrides: { primary_color: "blue" },
    }));
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, "TEMPLATE_INVALID_SPECIFICATION");
    assert.equal(result.errors[0].field, "brand_overrides.primary_color");
  });

  test("brand_overrides keys are whitelisted", () => {
    const result = validateLayoutManifest(validV1({
      brand_overrides: { primary_color: "#1A73E8", custom_texture: "x" },
    }));
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].field, "brand_overrides.custom_texture");
  });

  test("v0 manifest with a certified template passes", () => {
    const result = validateLayoutManifest({
      template_id: "mpp.feed.editorial",
      slides: [{ slot_id: "slide", text: "legacy copy", image_url: "https://example.com/x.png" }],
    });
    assert.equal(result.ok, true);
    assert.equal(result.template.id, "mpp.feed.editorial");
  });

  test("v0 manifest with a legacy template fails", () => {
    const result = validateLayoutManifest({
      template_id: "tpl_feed_generic_default",
      slides: [{ slot_id: "slide", text: "legacy copy" }],
    });
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, "TEMPLATE_NOT_CERTIFIED");
  });

  test("requireMedia rejects a missing required image", () => {
    const result = validateLayoutManifest(validV1(), { requireMedia: true });
    assert.equal(result.ok, false);
    const media = result.errors.find((e) => e.code === "TEMPLATE_MEDIA_UNAVAILABLE");
    assert.ok(media);
    assert.equal(media.slotId, "hero");
    assert.equal(media.reason, "required_media_missing");
  });

  test("requireMedia passes when the required image is present", () => {
    const result = validateLayoutManifest(validV1({
      slides: [{ headline: "A clear headline", body: "ok", cta: "Go", image: "https://example.com/hero.png" }],
    }), { requireMedia: true });
    assert.equal(result.ok, true);
  });

  test("validateManifestOrThrow throws the first error code with details", () => {
    assert.throws(
      () => validateManifestOrThrow(validV1({ template_id: "tpl_feed_generic_default" })),
      (err) => err.code === "TEMPLATE_NOT_CERTIFIED" && Array.isArray(err.details.errors),
    );
    assert.equal(validateManifestOrThrow(validV1()).id, "mpp.feed.editorial");
  });
});
