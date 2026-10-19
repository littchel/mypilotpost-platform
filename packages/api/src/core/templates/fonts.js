import { FONT_BYTES } from "./fontBytes.js";

export { FONT_BYTES };

/**
 * Controlled font registry. Preview and production both read these files.
 * Runtime Google/OS font fetches are not a production path.
 */
export const FONT_REGISTRY = {
  Inter: {
    family: "Inter",
    source: "bundled",
    styles: ["normal"],
    fallback: null,
    weights: {
      400: "inter-latin-400-normal.woff",
      600: "inter-latin-600-normal.woff",
      700: "inter-latin-700-normal.woff",
    },
  },
};

const bufferCache = new Map();

export function isRegisteredFont(family) {
  return Boolean(family && FONT_REGISTRY[family]);
}

export function resolveFontUse({ family, weight, purpose, allowSubstitute = false, approvedSubstitute = null }) {
  const requestedFamily = family || null;
  const requestedWeight = Number(weight);
  const entry = FONT_REGISTRY[requestedFamily];
  const file = entry?.weights?.[requestedWeight];
  if (entry && file && FONT_BYTES[file]) {
    return {
      requestedFamily,
      requestedWeight,
      usedFamily: requestedFamily,
      usedWeight: requestedWeight,
      substituted: false,
      reason: null,
      certifiedComposition: true,
      purpose: purpose || "template",
    };
  }
  const sub = allowSubstitute ? FONT_REGISTRY[approvedSubstitute] : null;
  const subFile = sub?.weights?.[requestedWeight];
  if (sub && subFile && FONT_BYTES[subFile]) {
    return {
      requestedFamily,
      requestedWeight,
      usedFamily: approvedSubstitute,
      usedWeight: requestedWeight,
      substituted: true,
      reason: "approved_substitute",
      certifiedComposition: true,
      purpose: purpose || "template",
    };
  }
  const err = new Error(`TEMPLATE_FONT_UNAVAILABLE: ${requestedFamily || "missing"} ${requestedWeight || ""}`.trim());
  err.code = "TEMPLATE_FONT_UNAVAILABLE";
  err.details = {
    requestedFamily,
    requestedWeight,
    usedFamily: null,
    substituted: false,
    reason: entry ? "weight_not_bundled" : "family_not_registered",
    certifiedComposition: false,
    purpose: purpose || "template",
    retryable: false,
    action: "Add the font and weight to the approved registry, or change the template specification.",
  };
  throw err;
}

/** @deprecated Silent Inter substitution is not a successful certified render. */
export function resolveFontFamily(requested) {
  return resolveFontUse({ family: requested, weight: 400, purpose: "probe" });
}

export async function loadFontBuffer(filename) {
  if (bufferCache.has(filename)) return bufferCache.get(filename);
  const bytes = FONT_BYTES[filename];
  if (!bytes) {
    throw new Error(`FONT_NOT_REGISTERED: missing bundled file ${filename}`);
  }
  bufferCache.set(filename, bytes);
  return bytes;
}

export async function loadSatoriFonts(families = ["Inter"]) {
  const fonts = [];
  const seen = new Set();
  for (const requested of families) {
    if (!isRegisteredFont(requested)) continue;
    if (seen.has(requested)) continue;
    seen.add(requested);
    const entry = FONT_REGISTRY[requested];
    for (const [weight, file] of Object.entries(entry.weights)) {
      const data = await loadFontBuffer(file);
      fonts.push({
        name: requested,
        weight: Number(weight),
        style: "normal",
        data,
      });
    }
  }
  if (!fonts.length) {
    throw new Error("TEMPLATE_FONT_UNAVAILABLE: no bundled fonts could be loaded");
  }
  return fonts;
}
