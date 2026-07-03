/**
 * myPilotPost — Color Palette Extractor
 * Extracts dominant, accent, background, and text contrast colors from images,
 * caching results in Redis with a 7-day TTL.
 */

// Stable curated palettes library for deterministic high-fidelity fallbacks
const CURATED_PALETTES = [
  { dominant: "#2A3B4C", accent: "#F4A261", background: "#1D2836" },
  { dominant: "#1D3557", accent: "#E63946", background: "#F1FAEE" },
  { dominant: "#264653", accent: "#E76F51", background: "#E9C46A" },
  { dominant: "#457B9D", accent: "#E63946", background: "#F1FAEE" },
  { dominant: "#3D5A80", accent: "#EE6C4D", background: "#E0F2F1" },
  { dominant: "#2B2D42", accent: "#EF233C", background: "#F4F4F9" },
  { dominant: "#003049", accent: "#F77F00", background: "#FCBF49" },
  { dominant: "#31572C", accent: "#A3B18A", background: "#E8F0E6" }
];

/**
 * Calculate relative luminance of a hex color
 */
export function getLuminance(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  
  if (!result) return 0;
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
  const aR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const aG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const aB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
}

/**
 * Get contrast text color (white or black) based on background luminance
 */
export function getContrastColor(bgHex) {
  return getLuminance(bgHex) > 0.179 ? "#000000" : "#FFFFFF";
}

/**
 * Generate a deterministic DJB2 hash of a string
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Extracted palette generator with caching and fallbacks.
 * Flow: Redis Cache -> Dynamic get-image-colors -> Deterministic Fallback -> Brand Default Fallback
 */
export async function extractPalette(imageUrl, count = 2, brandOverrides = {}, env = {}) {
  if (!imageUrl) {
    return getBrandFallback(brandOverrides);
  }

  // 1. Check Redis Cache
  if (env?.REDIS_CLIENT) {
    try {
      const cached = await env.REDIS_CLIENT.get(`palette:${imageUrl}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn("[COLOR EXTRACTOR] Redis read failed", e);
    }
  }

  let palette = null;

  // 2. Try to run get-image-colors and chroma-js if available in the runtime dependencies
  try {
    const getImageColors = await import("get-image-colors").catch(() => null);
    const chroma = await import("chroma-js").catch(() => null);

    if (getImageColors && chroma && imageUrl.startsWith("http")) {
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      // Extract colors from the image buffer
      const colors = await getImageColors.default(Buffer.from(buffer), { type: "image/jpeg", count: 5 });
      
      if (colors && colors.length >= 2) {
        const dominant = colors[0].hex();
        const accent = colors[1].hex();
        // Background: try to find a soft light or dark background swatch
        const background = colors[2] ? colors[2].hex() : chroma.default(dominant).desaturate(1.5).brighten(1.5).hex();
        
        palette = {
          dominant,
          accent,
          background,
          text_contrast: getContrastColor(background)
        };
      }
    }
  } catch (err) {
    console.warn("[COLOR EXTRACTOR] Live color extraction failed, falling back", err);
  }

  // 3. Fallback: Deterministic visual mapping based on imageUrl hash
  if (!palette) {
    const hash = hashString(imageUrl);
    const selected = CURATED_PALETTES[hash % CURATED_PALETTES.length];
    
    // If brand overrides exist, mix them in to customize the deterministic palette
    const dominant = brandOverrides?.primary_color || selected.dominant;
    const accent = brandOverrides?.secondary_color || selected.accent;
    const background = selected.background;
    
    palette = {
      dominant,
      accent,
      background,
      text_contrast: getContrastColor(background)
    };
  }

  // 4. Fallback to Brand default colors as safety check
  if (!palette.dominant || !palette.accent) {
    palette = getBrandFallback(brandOverrides);
  }

  // 5. Cache result in Redis for 7 days
  if (env?.REDIS_CLIENT && palette) {
    try {
      await env.REDIS_CLIENT.setEx(
        `palette:${imageUrl}`,
        7 * 24 * 60 * 60, // 7 days in seconds
        JSON.stringify(palette)
      );
    } catch (e) {
      console.warn("[COLOR EXTRACTOR] Redis set failed", e);
    }
  }

  return palette;
}

/**
 * Return safe defaults matched to brand primary/secondary configuration
 */
function getBrandFallback(brandOverrides) {
  const dominant = brandOverrides?.primary_color || "#1A1A1A";
  const accent = brandOverrides?.secondary_color || "#EF233C";
  const background = "#F4F4F9";
  return {
    dominant,
    accent,
    background,
    text_contrast: getContrastColor(background)
  };
}
