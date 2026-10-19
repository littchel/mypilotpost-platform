import { listCertifiedTemplates, requireCertifiedTemplate, getCertifiedTemplate } from "./registry.js";
import { templateError, TEMPLATE_NOT_CERTIFIED } from "./errors.js";

function hash(seed) {
  let h = 2166136261;
  const s = String(seed || "default");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function selectCertifiedTemplate({ format, seed, preferredId }) {
  if (preferredId) {
    const preferred = getCertifiedTemplate(preferredId);
    if (preferred && preferred.format === format) return preferred;
  }
  const pool = listCertifiedTemplates().filter((t) => t.format === format);
  if (!pool.length) {
    throw templateError(TEMPLATE_NOT_CERTIFIED, `TEMPLATE_NOT_CERTIFIED: no template for ${format}`);
  }
  return pool[hash(seed) % pool.length];
}

export function formatForCard(card) {
  const framework = String(card?.framework || "").toLowerCase();
  const media = String(card?.media_type || "").toLowerCase();
  if (media.includes("carousel") || framework.includes("list") || framework.includes("mistake") || framework.includes("before")) {
    return "carousel";
  }
  if (media.includes("story") || framework.includes("behind") || framework.includes("announcement")) {
    return "story";
  }
  if (framework.includes("offer") || framework.includes("product") || media.includes("promo")) {
    return "promotional";
  }
  return "feed_post";
}

export function assignCertifiedTemplates(cards, brandId) {
  const day = new Date().toISOString().slice(0, 10);
  return cards.map((card, index) => {
    const format = formatForCard(card);
    const template = selectCertifiedTemplate({
      format,
      seed: `${brandId}:${day}:${format}:${index}`,
      preferredId: null,
    });
    return {
      ...card,
      template_id: template.id,
      template_variant: null,
      template_format: format,
    };
  });
}

export function capacityFor(templateId) {
  const template = requireCertifiedTemplate(templateId);
  const slide = template.slides[0];
  const caps = {};
  for (const slot of slide.slots) {
    if (slot.type === "text" || slot.type === "cta") {
      caps[slot.contentKey] = {
        maxCharacters: slot.maxCharacters,
        maxLines: slot.maxLines,
        minFontSize: slot.minFontSize,
      };
    }
  }
  return caps;
}
