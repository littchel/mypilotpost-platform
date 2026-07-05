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
    watermark_position,
    background_preference: background_pref,

    // Contrast logic for light, dark, and accent backgrounds
    contrast_on_dark: '#FFFFFF',
    contrast_on_light: '#0f172a',
    contrast_on_accent: getContrastColor(accent_color),
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

function getContrastColor(hex) {
  const c = (hex || '#2563eb').replace('#', '');
  if (c.length !== 6) return '#FFFFFF';
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#FFFFFF';
}
