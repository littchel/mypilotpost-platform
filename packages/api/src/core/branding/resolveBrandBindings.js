// packages/api/src/core/branding/resolveBrandBindings.js
//
// ONE function that turns a brand_id into concrete visual values.
// Expose this as the single source of truth for branding resolutions.

export async function resolveBrandBindings(brand_id, env) {
  const db = env.DB || env.mypilotpost;
  if (!db) {
    throw new Error("[RESOLVE BRAND BINDINGS] Database binding not found in environment.");
  }

  let row = null;
  try {
    row = await db.prepare(
      `SELECT 
        primary_color_hex, secondary_color_hex, accent_color,
        font_pairing_headline, font_pairing_body,
        logo_asset_url, watermark_position, background_preference
       FROM brand_dna_visual_identity
       WHERE brand_id = ?`
    ).bind(brand_id).first();
  } catch (err) {
    console.warn("[RESOLVE BRAND BINDINGS] DB query failed or columns missing, using defaults:", err);
  }

  // Brand display name lives on the brands table (not the visual-identity row), so
  // fetch it separately for brand.name bindings (e.g. an athletic header pill label).
  let brand_name = null;
  try {
    const nameRow = await db.prepare(`SELECT name FROM brands WHERE id = ?`).bind(brand_id).first();
    brand_name = nameRow?.name || null;
  } catch (err) {
    console.warn("[RESOLVE BRAND BINDINGS] brand name lookup failed:", err);
  }

  // Simplified bindings lookup
  const primary_color      = row?.primary_color_hex     || '#2563eb';
  const secondary_color    = row?.secondary_color_hex   || '#0f172a';
  const accent_color       = row?.accent_color          || primary_color;
  const heading_font       = row?.font_pairing_headline || 'Inter';
  const body_font          = row?.font_pairing_body     || 'Inter';
  const logo_url           = row?.logo_asset_url        || null;
  const watermark_position = row?.watermark_position    || 'bottom_right';
  const background_pref    = row?.background_preference || 'light';

  return {
    primary_color,
    secondary_color,
    accent_color,
    heading_font,
    body_font,
    logo_url,
    name: brand_name || 'Your Brand',
    watermark_position,
    background_preference: background_pref,

    // Contrast logic for light, dark, and accent backgrounds
    contrast_on_dark: '#FFFFFF',
    contrast_on_light: '#0f172a',
    contrast_on_accent: getContrastColor(accent_color),
    // Contrast for text sitting directly on the primary / secondary brand colour —
    // lets a template bind its canvas to brand.primary_color and still pick a legible
    // text colour regardless of whether that brand colour is light or dark.
    contrast_on_primary: getContrastColor(primary_color),
    contrast_on_secondary: getContrastColor(secondary_color),
    // Surface color follows the brand's background preference (light → white,
    // dark → near-black), so a template can bind a card/panel to brand.surface_color
    // and get a sensible base regardless of the brand's light/dark leaning.
    surface_color: background_pref === 'dark' ? '#121212' : '#FFFFFF',
    contrast_on_surface: background_pref === 'dark' ? '#FFFFFF' : '#111111',
  };
}

// Resolves a single template property binding against the bindings object
export function resolveValue(raw, bindings) {
  if (typeof raw === 'string' && raw.startsWith('brand.')) {
    const key = raw.slice('brand.'.length);
    return bindings[key] ?? raw;
  }
  return raw;
}

// Resolve a color binding and apply an optional opacity, producing an rgba() string.
// Lets schema v3 card_layer/meta_tag tints reference a brand.* colour at reduced
// opacity (e.g. brand.primary_color at 0.15) without inventing new template syntax.
// Falls back to the resolved colour if no opacity is given or it can't be parsed.
export function resolveColorWithOpacity(raw, opacity, bindings) {
  const color = resolveValue(raw, bindings);
  if (opacity === undefined || opacity === null || Number(opacity) === 1) return color;
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const a = Math.max(0, Math.min(1, Number(opacity)));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  let c = hex.trim().replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6 || /[^0-9a-fA-F]/.test(c)) return null;
  return { r: parseInt(c.slice(0, 2), 16), g: parseInt(c.slice(2, 4), 16), b: parseInt(c.slice(4, 6), 16) };
}

function getContrastColor(hex) {
  const c = (hex || '#2563eb').replace('#', '');
  if (c.length !== 6) return '#FFFFFF';
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#FFFFFF';
}
