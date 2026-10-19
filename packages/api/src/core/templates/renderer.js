import { Resvg } from "@resvg/resvg-wasm";
import { requireCertifiedTemplate } from "./registry.js";
import { loadSatoriFonts, resolveFontUse } from "./fonts.js";
import { templateError, TEMPLATE_MEDIA_UNAVAILABLE, TEMPLATE_CONTENT_OVERFLOW } from "./errors.js";
import { fitSlideContent } from "./fit.js";
import { prepareSlotImage } from "./mediaCrop.js";
import { resolveBrandBindings } from "../branding/resolveBrandBindings.js";

let satoriReady = null;
async function loadSatori() {
  if (!satoriReady) {
    satoriReady = (async () => {
      const onWorkers = typeof navigator !== "undefined"
        && /Cloudflare|workerd/i.test(navigator.userAgent || "");
      if (onWorkers) {
        const { default: satori, init } = await import("satori/standalone");
        const yoga = (await import("satori/yoga.wasm")).default;
        const { initWasm } = await import("@resvg/resvg-wasm");
        const resvgWasm = (await import("@resvg/resvg-wasm/index_bg.wasm")).default;
        await Promise.all([initWasm(resvgWasm), init(yoga)]);
        return satori;
      }
      const { default: satori } = await import("satori");
      const { initWasm } = await import("@resvg/resvg-wasm");
      const { readFile } = await import("node:fs/promises");
      const { createRequire } = await import("node:module");
      const wasmPath = createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm");
      await initWasm(await readFile(wasmPath));
      return satori;
    })().catch((err) => {
      satoriReady = null;
      throw err;
    });
  }
  return satoriReady;
}

function tokenColor(token, brand) {
  switch (token) {
    case "primary": return brand.primary_color;
    case "secondary": return brand.secondary_color;
    case "accent": return brand.accent_color;
    case "surface": return brand.surface_color;
    case "onPrimary": return brand.contrast_on_primary;
    case "onSecondary": return brand.contrast_on_secondary;
    case "onSurface": return brand.contrast_on_surface;
    case "onAccent": return brand.contrast_on_accent;
    default: return brand.contrast_on_surface;
  }
}

function slideContent(content, index) {
  if (Array.isArray(content?.slides) && content.slides[index]) return content.slides[index];
  return content || {};
}

function buildTree(template, slide, content, fitted, brand) {
  const children = [...slide.slots]
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    .map((slot) => nodeForSlot(slot, content, fitted[slot.id], brand));

  return {
    type: "div",
    props: {
      style: {
        width: template.canvas.width,
        height: template.canvas.height,
        display: "flex",
        position: "relative",
        backgroundColor: brand.surface_color,
      },
      children,
    },
  };
}

function nodeForSlot(slot, content, fit, brand) {
  const box = {
    position: "absolute",
    left: slot.x,
    top: slot.y,
    width: slot.width,
    height: slot.height,
    display: "flex",
  };

  if (slot.type === "shape") {
    return {
      type: "div",
      props: { style: { ...box, backgroundColor: tokenColor(slot.token, brand), borderRadius: slot.radius || 0 } },
    };
  }

  if (slot.type === "media") {
    const src = content[slot.contentKey] || content.image || content.image_url || "";
    if (!src) {
      if (slot.required) {
        throw templateError(TEMPLATE_MEDIA_UNAVAILABLE, `TEMPLATE_MEDIA_UNAVAILABLE: ${slot.id}`, {
          slotId: slot.id,
          reason: "required_media_missing",
          retryable: true,
          action: "Provide a media asset that matches the slot profile.",
        });
      }
      return { type: "div", props: { style: { ...box, backgroundColor: brand.secondary_color } } };
    }
    const focal = slot.focalPoint || { x: 0.5, y: 0.5 };
    return {
      type: "img",
      props: {
        src,
        width: slot.width,
        height: slot.height,
        style: {
          ...box,
          objectFit: slot.fit || "cover",
          objectPosition: `${focal.x * 100}% ${focal.y * 100}%`,
        },
      },
    };
  }

  if (slot.type === "logo") {
    if (!brand.logo_url) {
      return { type: "div", props: { style: { ...box } } };
    }
    return {
      type: "img",
      props: {
        src: brand.logo_url,
        width: slot.width,
        height: slot.height,
        style: { ...box, objectFit: "contain" },
      },
    };
  }

  const value = fit?.text || "";
  const font = resolveFontUse({
    family: "Inter",
    weight: slot.fontWeight || 400,
    purpose: slot.id,
    allowSubstitute: false,
  });
  if (brand.heading_font && brand.heading_font !== "Inter") {
    font.brandPreference = brand.heading_font;
    font.brandPreferenceApplied = false;
    font.brandPreferenceReason = "template_typography_is_inter_override_not_permitted";
  }
  const isCta = slot.type === "cta";
  return {
    type: "div",
    props: {
      style: {
        ...box,
        backgroundColor: isCta ? brand.accent_color : "transparent",
        color: tokenColor(slot.colorToken, brand),
        fontFamily: font.usedFamily,
        fontSize: fit?.fontSize || slot.maxFontSize,
        fontWeight: slot.fontWeight,
        lineHeight: slot.lineHeight,
        alignItems: "center",
        justifyContent: slot.align === "center" ? "center" : "flex-start",
        paddingLeft: isCta ? 16 : 0,
        paddingRight: isCta ? 16 : 0,
        borderRadius: isCta ? 8 : 0,
        overflow: "hidden",
      },
      children: value,
    },
  };
}

export function resolveTemplateFonts(template) {
  const records = [];
  for (const slide of template.slides || []) {
    for (const slot of slide.slots || []) {
      if (slot.type !== "text" && slot.type !== "cta") continue;
      records.push(resolveFontUse({
        family: "Inter",
        weight: slot.fontWeight || 400,
        purpose: `${template.id}:${slot.id}`,
        allowSubstitute: false,
      }));
    }
  }
  return records;
}

export async function renderCertifiedSlides(templateOrId, content, brandId, env) {
  const template = typeof templateOrId === "string"
    ? requireCertifiedTemplate(templateOrId)
    : requireCertifiedTemplate(templateOrId?.id);

  const satori = await loadSatori();
  let brand;
  try {
    brand = await resolveBrandBindings(brandId, env);
  } catch {
    brand = await resolveBrandBindings(brandId, { DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } });
  }
  const fonts = await loadSatoriFonts([brand.heading_font, brand.body_font, "Inter"]);
  const fontResolution = resolveTemplateFonts(template);
  const pngs = [];

  for (let i = 0; i < template.slides.length; i++) {
    const slide = template.slides[i];
    const slideCopy = slideContent(content, i);
    const { rejected, fitted } = fitSlideContent(slide, slideCopy);
    if (rejected.length) {
      throw templateError(
        TEMPLATE_CONTENT_OVERFLOW,
        "TEMPLATE_CONTENT_OVERFLOW",
        { templateId: template.id, slots: rejected, retryable: true, action: "Shorten the copy for the named slot. Rendering will not change approved copy." },
      );
    }
    const prepared = { ...slideCopy };
    for (const slot of slide.slots) {
      if (slot.type !== "media") continue;
      const src = prepared[slot.contentKey] || prepared.image || prepared.image_url || "";
      if (!src) continue;
      const cropped = await prepareSlotImage(src, slot);
      if (cropped.cropped) {
        prepared[slot.contentKey] = cropped.src;
        if (slot.contentKey !== "image") prepared.image = cropped.src;
      }
    }
    const tree = buildTree(template, slide, prepared, fitted, brand);
    const svg = await satori(tree, {
      width: template.canvas.width,
      height: template.canvas.height,
      fonts,
    });
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: template.canvas.width } });
    const png = Buffer.from(resvg.render().asPng());
    png.fontResolution = fontResolution;
    pngs.push(png);
  }
  return pngs;
}

export async function renderTemplateFlat(template, content, brandId, env) {
  const id = template?.id || template?.template_id || template;
  const pngs = await renderCertifiedSlides(id, content, brandId, env);
  return pngs[0];
}

export async function renderTemplateSlides(template, slides, brandId, env) {
  const id = template?.id || template?.template_id || template;
  return renderCertifiedSlides(id, { slides }, brandId, env);
}
