import { test, describe } from "node:test";
import assert from "node:assert";
import { listCertifiedTemplates, getCertifiedTemplate, requireCertifiedTemplate } from "./registry.js";
import { certifyTemplate, LEGACY_TEMPLATE_IDS } from "./certify.js";
import { fitText } from "./fit.js";
import { scoreMediaDesign } from "./mediaMatch.js";
import { isRegisteredFont, resolveFontFamily, resolveFontUse, loadSatoriFonts } from "./fonts.js";
import { selectCertifiedTemplate } from "./select.js";
import { CANDIDATE_TEMPLATES } from "./catalogue.js";
import { renderTemplateFlat } from "./renderer.js";
import sharp from "sharp";

describe("certified template system", () => {
  test("registers only certified templates", () => {
    const all = listCertifiedTemplates();
    assert.ok(all.length >= 10 && all.length <= 15);
    for (const t of all) {
      assert.equal(t.status, "certified");
      assert.equal(t.renderer.id, "canonical-satori");
      assert.equal(getCertifiedTemplate(t.id)?.id, t.id);
    }
  });

  test("rejects legacy and unknown ids", () => {
    for (const id of LEGACY_TEMPLATE_IDS) {
      assert.equal(getCertifiedTemplate(id), null);
      assert.throws(() => requireCertifiedTemplate(id), (err) => err.code === "TEMPLATE_NOT_CERTIFIED");
    }
    assert.throws(() => requireCertifiedTemplate("not-a-template"), (err) => err.code === "TEMPLATE_NOT_CERTIFIED");
  });

  test("refuses to certify a legacy id even if the rest is copied", () => {
    const copy = { ...CANDIDATE_TEMPLATES[0], id: "tpl_feed_generic_default" };
    const result = certifyTemplate(copy);
    assert.equal(result.ok, false);
  });

  test("missing slot fails certification", () => {
    const broken = structuredClone(CANDIDATE_TEMPLATES[0]);
    broken.id = "mpp.feed.broken";
    broken.slides[0].slots = broken.slides[0].slots.filter((s) => s.type === "shape");
    const result = certifyTemplate(broken);
    assert.equal(result.ok, false);
  });

  test("text fit rejects overflow and keeps short copy", () => {
    const headline = listCertifiedTemplates()[0].slides[0].slots.find((s) => s.role === "headline");
    const short = fitText("A clear headline", headline);
    assert.equal(short.action, "render");
    assert.ok(short.fontSize >= headline.minFontSize);
    const huge = fitText("word ".repeat(400), headline);
    assert.equal(huge.action, "reject");
    assert.equal(huge.code, "CONTENT_EXCEEDS_CAPACITY");
  });

  test("cta over the character capacity is rejected", () => {
    const cta = listCertifiedTemplates().flatMap((t) => t.slides[0].slots).find((s) => s.role === "cta");
    const over = fitText("X".repeat(cta.maxCharacters + 5), cta);
    assert.equal(over.action, "reject");
  });

  test("media profile scores aspect ratio and focal conflict", () => {
    const media = listCertifiedTemplates().flatMap((t) => t.slides.flatMap((s) => s.slots)).find((s) => s.type === "media");
    const good = scoreMediaDesign({ width: 1600, height: 1200, focalPoint: media.focalPoint }, media);
    const bad = scoreMediaDesign({ width: 200, height: 2000, focalPoint: { x: 0, y: 1 }, hasText: true }, media);
    assert.ok(good.score > bad.score);
  });

  test("fonts are registered and brand fonts cannot invent a family", async () => {
    assert.equal(isRegisteredFont("Inter"), true);
    assert.equal(isRegisteredFont("Comic Sans"), false);
    assert.throws(() => resolveFontFamily("Comic Sans"), (err) => err.code === "TEMPLATE_FONT_UNAVAILABLE");
    assert.throws(
      () => resolveFontUse({ family: "Inter", weight: 800, purpose: "headline" }),
      (err) => err.code === "TEMPLATE_FONT_UNAVAILABLE" && err.details.reason === "weight_not_bundled",
    );
    const fonts = await loadSatoriFonts(["Inter"]);
    assert.ok(fonts.length >= 3);
    assert.ok(fonts.every((f) => f.data && f.data.byteLength > 100));
  });

  test("selection never returns an uncertified template", () => {
    const chosen = selectCertifiedTemplate({ format: "story", seed: "brand-a" });
    assert.equal(chosen.status, "certified");
    assert.equal(chosen.format, "story");
    assert.throws(() => selectCertifiedTemplate({ format: "reel", seed: "x" }));
  });

  test("canonical renderer emits a png and fails closed", async () => {
    const env = {
      DB: {
        prepare: () => ({
          bind: () => ({
            first: async () => ({
              primary_color_hex: "#111827",
              secondary_color_hex: "#F8FAFC",
              accent_color: "#2563EB",
              font_pairing_headline: "Inter",
              font_pairing_body: "Inter",
              logo_asset_url: null,
              background_preference: "light",
            }),
          }),
        }),
      },
    };
    const image = `data:image/png;base64,${(await sharp({
      create: { width: 1200, height: 900, channels: 3, background: { r: 30, g: 120, b: 70 } },
    }).png().toBuffer()).toString("base64")}`;
    await assert.rejects(
      () => renderTemplateFlat("mpp.feed.editorial", {
        headline: "A clear offer",
        body: "One sentence that fits the slot.",
        cta: "Book a call",
      }, "brand-a", env),
      (err) => err.code === "TEMPLATE_MEDIA_UNAVAILABLE",
    );
    const png = await renderTemplateFlat("mpp.feed.editorial", {
      headline: "A clear offer",
      body: "One sentence that fits the slot.",
      cta: "Book a call",
      image,
    }, "brand-a", env);
    assert.equal(Buffer.from(png).subarray(0, 4).toString("hex"), "89504e47");
    await assert.rejects(
      () => renderTemplateFlat("mpp.feed.editorial", { headline: "word ".repeat(200), body: "ok", cta: "Go" }, "brand-a", env),
      (err) => err.code === "TEMPLATE_CONTENT_OVERFLOW",
    );
    await assert.rejects(
      () => renderTemplateFlat("tpl_feed_generic_default", { headline: "x" }, "brand-a", env),
      (err) => err.code === "TEMPLATE_NOT_CERTIFIED",
    );
  });

  test("every template declares canvas, safe area, and capacity", () => {
    for (const t of listCertifiedTemplates()) {
      assert.ok(t.canvas.width > 0 && t.canvas.height > 0);
      assert.ok(t.canvas.safeArea.top >= 0);
      const text = t.slides[0].slots.filter((s) => s.type === "text" || s.type === "cta");
      assert.ok(text.length > 0);
      for (const slot of text) {
        assert.ok(slot.maxCharacters > 0);
        assert.ok(slot.minFontSize >= 18);
      }
    }
  });
});
