import { getCertifiedTemplate } from "./registry.js";
import { fitSlideContent } from "./fit.js";
import {
  templateError,
  TEMPLATE_NOT_CERTIFIED,
  TEMPLATE_INVALID_SPECIFICATION,
  TEMPLATE_MEDIA_UNAVAILABLE,
} from "./errors.js";

const BRAND_OVERRIDE_KEYS = new Set(["primary_color", "secondary_color", "accent_color", "font_stack", "logo_url"]);
const COLOR_KEYS = new Set(["primary_color", "secondary_color", "accent_color"]);
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
const SLIDE_META_KEYS = new Set(["slide_id"]);

function invalid(reason, field, slide) {
  const entry = { code: TEMPLATE_INVALID_SPECIFICATION, reason, action: "reject" };
  if (field) entry.field = field;
  if (slide !== undefined) entry.slide = slide;
  return entry;
}

function validateBrandOverrides(overrides, errors) {
  if (overrides === undefined || overrides === null) return;
  if (typeof overrides !== "object" || Array.isArray(overrides)) {
    errors.push(invalid("brand_overrides_not_object", "brand_overrides"));
    return;
  }
  for (const [key, value] of Object.entries(overrides)) {
    const field = `brand_overrides.${key}`;
    if (!BRAND_OVERRIDE_KEYS.has(key)) {
      errors.push(invalid("brand_override_key_not_allowed", field));
      continue;
    }
    if (typeof value !== "string") {
      errors.push(invalid("brand_override_value_not_string", field));
      continue;
    }
    if (COLOR_KEYS.has(key) && !COLOR_RE.test(value)) {
      errors.push(invalid("brand_override_color_invalid", field));
    }
  }
}

export function validateLayoutManifest(manifest, { requireMedia = false } = {}) {
  const errors = [];

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ok: false, errors: [invalid("manifest_not_object", "manifest")] };
  }

  const version = manifest.manifest_version === undefined ? 0 : manifest.manifest_version;
  if (version !== 0 && version !== 1) {
    return { ok: false, errors: [invalid("manifest_version_unsupported", "manifest_version")] };
  }

  const templateId = manifest.template_id;
  if (!templateId || typeof templateId !== "string") {
    return { ok: false, errors: [invalid("template_id_missing", "template_id")] };
  }
  const template = getCertifiedTemplate(templateId);
  if (!template) {
    return {
      ok: false,
      errors: [{ code: TEMPLATE_NOT_CERTIFIED, field: "template_id", reason: "template_not_certified", action: "reject" }],
    };
  }

  if (version === 0) {
    if (manifest.slides !== undefined && !Array.isArray(manifest.slides)) {
      errors.push(invalid("slides_not_array", "slides"));
    }
    return errors.length ? { ok: false, errors } : { ok: true, template };
  }

  if (manifest.template_variant !== undefined && manifest.template_variant !== null) {
    errors.push(invalid("template_variant_not_supported", "template_variant"));
  }

  validateBrandOverrides(manifest.brand_overrides, errors);

  if (!Array.isArray(manifest.slides)) {
    errors.push(invalid("slides_not_array", "slides"));
    return { ok: false, errors };
  }
  if (manifest.slides.length !== template.slides.length) {
    errors.push(invalid("slide_count_mismatch", "slides"));
    return { ok: false, errors };
  }

  for (let i = 0; i < template.slides.length; i++) {
    const slide = template.slides[i];
    const content = manifest.slides[i];
    if (!content || typeof content !== "object" || Array.isArray(content)) {
      errors.push(invalid("slide_not_object", "slides", i));
      continue;
    }

    const allowedKeys = new Set();
    let hasMediaSlot = false;
    for (const slot of slide.slots) {
      if (slot.contentKey) allowedKeys.add(slot.contentKey);
      if (slot.type === "media") hasMediaSlot = true;
    }
    if (hasMediaSlot) {
      allowedKeys.add("image");
      allowedKeys.add("image_url");
    }
    for (const key of Object.keys(content)) {
      if (!allowedKeys.has(key) && !SLIDE_META_KEYS.has(key)) {
        errors.push(invalid("slide_content_key_unknown", key, i));
      }
    }

    const { rejected } = fitSlideContent(slide, content);
    for (const r of rejected) {
      errors.push({ code: r.code, slide: i, slotId: r.slotId, reason: r.reason, action: "reject" });
    }

    if (requireMedia) {
      for (const slot of slide.slots) {
        if (slot.type !== "media" || !slot.required) continue;
        const src = content[slot.contentKey] || content.image || content.image_url || "";
        if (!src) {
          errors.push({
            code: TEMPLATE_MEDIA_UNAVAILABLE,
            slide: i,
            slotId: slot.id,
            reason: "required_media_missing",
            action: "reject",
          });
        }
      }
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, template };
}

export function validateManifestOrThrow(manifest, options = {}) {
  const result = validateLayoutManifest(manifest, options);
  if (!result.ok) {
    const first = result.errors[0];
    throw templateError(first.code, `${first.code}: ${first.reason}`, { errors: result.errors });
  }
  return result.template;
}
