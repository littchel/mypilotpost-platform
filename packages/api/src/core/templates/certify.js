import { parseTemplate } from "./schema.js";
import { FONT_REGISTRY } from "./fonts.js";
import { fitText } from "./fit.js";

export const LEGACY_TEMPLATE_IDS = new Set([
  "tpl_carousel_premium_brand_story",
  "tpl_feed_generic_default",
  "minimal_text_feed",
  "hero_headline_feed",
  "quote_card_feed",
  "split_layout_feed",
  "product_showcase_feed",
  "carousel_list_005",
  "carousel_story_006",
  "carousel_comparison_004",
  "carousel_faq_005",
  "carousel_data_008",
  "story_fullscreen",
  "story_split",
  "story_poll",
  "reel_hook",
  "reel_loop",
  "glassmorphic_eco_editorial",
]);

function boxesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function insideSafe(slot, canvas) {
  const s = canvas.safeArea;
  return slot.x >= s.left
    && slot.y >= s.top
    && slot.x + slot.width <= canvas.width - s.right
    && slot.y + slot.height <= canvas.height - s.bottom;
}

export function certifyTemplate(template) {
  const errors = [];
  if (LEGACY_TEMPLATE_IDS.has(template?.id)) {
    errors.push("legacy_id_forbidden");
  }
  const parsed = parseTemplate(template);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message), template: null };
  }
  const tpl = parsed.data;
  const ids = new Set();
  for (const slide of tpl.slides) {
    const blockers = [];
    for (const slot of slide.slots) {
      if (ids.has(`${slide.id}:${slot.id}`)) errors.push(`duplicate_slot:${slot.id}`);
      ids.add(`${slide.id}:${slot.id}`);
      if (slot.x + slot.width > tpl.canvas.width || slot.y + slot.height > tpl.canvas.height) {
        errors.push(`slot_outside_canvas:${slot.id}`);
      }
      if (slot.type !== "shape" && slot.collide !== false && !insideSafe(slot, tpl.canvas)) {
        errors.push(`slot_outside_safe_area:${slot.id}`);
      }
      if (slot.type === "text" || slot.type === "cta") {
        if (slot.minFontSize < 18) errors.push(`unreadable_min_font:${slot.id}`);
        if (slot.minFontSize > slot.maxFontSize) errors.push(`font_range:${slot.id}`);
        const sample = "A".repeat(Math.min(slot.maxCharacters, 40));
        const fit = fitText(sample, slot);
        if (fit.action === "reject" && sample.length <= 12) errors.push(`capacity_impossible:${slot.id}`);
      }
      if (slot.type === "media" && (!slot.aspectRatio || !slot.focalPoint)) {
        errors.push(`media_profile_missing:${slot.id}`);
      }
      if (slot.collide !== false && slot.type !== "shape") blockers.push(slot);
    }
    for (let i = 0; i < blockers.length; i++) {
      for (let j = i + 1; j < blockers.length; j++) {
        const a = blockers[i];
        const b = blockers[j];
        const overlayOk = (a.type === "text" || a.type === "cta" || a.type === "logo") && b.type === "media";
        const overlayOk2 = (b.type === "text" || b.type === "cta" || b.type === "logo") && a.type === "media";
        if (!overlayOk && !overlayOk2 && boxesOverlap(a, b)) {
          errors.push(`collision:${a.id}:${b.id}`);
        }
      }
    }
  }
  if (!FONT_REGISTRY.Inter) errors.push("font_registry_missing");
  for (const slide of tpl.slides) {
    if (!slide.slots.some((s) => s.role === "headline" || s.role === "quote")) errors.push(`missing_headline:${slide.id}`);
    if (!slide.slots.some((s) => s.type === "logo" || s.type === "media" || s.role === "cta")) {
      errors.push(`missing_brand_or_action:${slide.id}`);
    }
  }
  if (errors.length) return { ok: false, errors, template: null };
  return {
    ok: true,
    errors: [],
    template: { ...tpl, status: "certified" },
  };
}
