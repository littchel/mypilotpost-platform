// packages/api/src/core/templates/flattenRenderer.js
//
// Replaces exactRenderer.js's headless-Chromium/Puppeteer screenshot approach.
// Runs as pure WASM/JS inside the Cloudflare Workers runtime.

import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { resolveBrandBindings, resolveValue } from '../branding/resolveBrandBindings.js';
import { normalizeTemplate } from '../../../../shared/src/templateNormalizer.ts';
let wasmReady = false;
async function ensureWasm() {
  if (!wasmReady) {
    let wasmModule;
    try {
      // Direct module import for Wrangler v3 / Cloudflare Workers
      const imported = await import('@resvg/resvg-wasm/index_bg.wasm');
      wasmModule = imported.default || imported;
    } catch (e) {
      if (typeof process !== 'undefined') {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const currentDir = path.dirname(new URL(import.meta.url).pathname);
        
        const candidatePaths = [
          path.resolve(currentDir, '../../../../../node_modules/@resvg/resvg-wasm/index_bg.wasm'),
          path.resolve(process.cwd(), '../../node_modules/@resvg/resvg-wasm/index_bg.wasm'),
          path.resolve(process.cwd(), '../node_modules/@resvg/resvg-wasm/index_bg.wasm'),
          path.resolve(process.cwd(), 'node_modules/@resvg/resvg-wasm/index_bg.wasm')
        ];
        
        let buffer = null;
        for (const p of candidatePaths) {
          try {
            buffer = fs.readFileSync(p);
            break;
          } catch (err) {}
        }
        
        if (!buffer) {
          throw new Error("[WASM LOADER] Failed to locate resvg-wasm index_bg.wasm in monorepo hoisting locations.");
        }
        wasmModule = await WebAssembly.compile(buffer);
      } else {
        throw e;
      }
    }
    await initWasm(wasmModule);
    wasmReady = true;
  }
}

const fontCacheMemory = new Map();

/**
 * @param template  Parsed template JSON (schema v2)
 * @param content   { headline, pre_headline, body, cta, handle, image_url, ... }
 * @param brand_id  Used to resolve brand.* bindings.
 * @param env       Worker env (for D1 access and R2 bucket access)
 * @returns Uint8Array PNG buffer, ready for R2.put()
 */
export async function renderTemplateFlat(template, content, brand_id, env) {
  const manifestSlides = [content];
  const pngs = await renderTemplateSlides(template, manifestSlides, brand_id, env);
  return pngs[0];
}

export async function renderTemplateSlides(template, manifestSlides, brand_id, env) {
  await ensureWasm();
  const bindings = await resolveBrandBindings(brand_id, env);
  const { width, height } = template.dimensions || { width: 1080, height: 1080 };
  const fonts = await loadFontsForBindings(bindings, env);

  // Helper to execute rendering for one slide
  const renderSingle = async (slots, slideContent) => {
    return await renderSingleSlide(slots, slideContent, bindings, width, height, fonts);
  };

  const normalizedSlides = normalizeTemplate(template);
  // Mismatched count rule: truncate to shorter length
  const renderCount = Math.min(manifestSlides.length, normalizedSlides.length);
  const pngs = [];

  for (let i = 0; i < renderCount; i++) {
    const slots = normalizedSlides[i];
    const manifestSlide = manifestSlides[i];
    const slideContent = mergeSlideContent(manifestSlide || {});

    const png = await renderSingle(slots, slideContent);
    pngs.push(png);
  }

  return pngs;
}

async function renderSingleSlide(slots, content, bindings, width, height, fonts) {
  const sorted = [...slots].sort(
    (a, b) => (a.z_index || 0) - (b.z_index || 0)
  );

  const children = sorted.map((slot) =>
    buildNode(slot, content, bindings)
  );

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { width, height, position: 'relative', display: 'flex' },
        children,
      },
    },
    {
      width,
      height,
      fonts,
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const png = resvg.render().asPng();
  return png;
}

function mergeSlideContent(manifestSlide) {
  return {
    headline: manifestSlide.headline || manifestSlide.text || '',
    body: manifestSlide.body || manifestSlide.caption || '',
    image_url: manifestSlide.image_url || manifestSlide.media_url || '',
    image_url_2: manifestSlide.image_url_2 || '',
    cta: manifestSlide.cta || 'Learn More',
    handle: manifestSlide.handle || '@mypilotpost'
  };
}

function cleanStyle(styleObj) {
  const clean = {};
  for (const [k, v] of Object.entries(styleObj)) {
    if (v !== undefined && v !== null) {
      clean[k] = v;
    }
  }
  return clean;
}

function pct(v) {
  if (v === undefined || v === null) return undefined;
  return typeof v === 'string' && v.endsWith('%') ? v : `${v}px`;
}

function buildNode(slot, content, bindings) {
  const base = {
    position: 'absolute',
    left: pct(slot.x),
    top: pct(slot.y),
    width: pct(slot.width),
    height: pct(slot.height),
  };

  switch (slot.type) {
    case 'image': {
      const src = content[slot.content_key] || content.image_url || slot.text || slot.url || "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=640&q=80";
      return {
        type: 'img',
        props: { src, style: cleanStyle({ ...base, objectFit: 'cover' }) },
      };
    }

    case 'logo': {
      const src = resolveValue(slot.source, bindings);
      if (!src) return { type: 'div', props: { style: cleanStyle(base) } };
      return {
        type: 'img',
        props: { src, style: cleanStyle({ ...base, objectFit: 'contain' }) },
      };
    }

    case 'shape': {
      return {
        type: 'div',
        props: {
          style: cleanStyle({
            ...base,
            backgroundColor: resolveValue(slot.fill, bindings),
            opacity: slot.opacity ?? 1,
            borderRadius: slot.radius || 0,
          }),
        },
      };
    }

    case 'text': {
      const raw = content[slot.content_key] ?? slot.text ?? '';
      return {
        type: 'div',
        props: {
          style: cleanStyle({
            ...base,
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              slot.align === 'center' ? 'center'
              : slot.align === 'right' ? 'flex-end'
              : 'flex-start',
            fontFamily: resolveValue(slot.font, bindings),
            fontWeight: slot.weight || 400,
            fontStyle: slot.style || 'normal',
            fontSize: slot.size,
            color: resolveValue(slot.color, bindings),
            border: slot.border
              ? `${slot.border.width} solid ${resolveValue(slot.border.color, bindings)}`
              : undefined,
            borderRadius: slot.border?.radius,
          }),
          children: fitToMaxChars(raw, slot.max_chars),
        },
      };
    }

    case 'cta_button': {
      const raw = content[slot.content_key] ?? slot.text ?? 'Learn More';
      return {
        type: 'div',
        props: {
          style: cleanStyle({
            ...base,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: resolveValue(slot.fill, bindings),
            color: resolveValue(slot.text_color, bindings),
            borderRadius: slot.radius || 8,
            fontFamily: resolveValue(slot.font, bindings),
            fontWeight: 700,
          }),
          children: fitToMaxChars(raw, slot.max_chars),
        },
      };
    }

    default:
      return { type: 'div', props: { style: cleanStyle(base) } };
  }
}

function fitToMaxChars(text, maxChars) {
  if (!maxChars || !text || text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + '\u2026';
}

async function loadFontsForBindings(bindings, env) {
  const families = new Set([bindings.heading_font, bindings.body_font, 'Inter']);
  const fonts = [];
  for (const family of families) {
    const data = await loadFontBuffer(family, env);
    if (data) {
      fonts.push({ name: family, data, weight: 400, style: 'normal' });
    }
  }
  return fonts;
}

async function loadFontBuffer(family, env) {
  if (fontCacheMemory.has(family)) {
    return fontCacheMemory.get(family);
  }

  const slug = family.toLowerCase().replace(/\s+/g, '-');
  const cacheKey = `https://internal/fonts/${slug}-regular.ttf`;
  const r2Key = `assets/fonts/${slug}-regular.ttf`;

  // 1. Try Cloudflare Cache API
  if (typeof caches !== 'undefined' && caches.default) {
    try {
      const cachedRes = await caches.default.match(cacheKey);
      if (cachedRes) {
        const buffer = await cachedRes.arrayBuffer();
        fontCacheMemory.set(family, buffer);
        console.log(`[FONT LOADER] Loaded ${family} from Cache API`);
        return buffer;
      }
    } catch (err) {
      console.warn("[FONT LOADER] Cache API match failed:", err);
    }
  }

  // 2. Try R2 Bucket
  if (env?.MEDIA_BUCKET) {
    try {
      const object = await env.MEDIA_BUCKET.get(r2Key);
      if (object) {
        const buffer = await object.arrayBuffer();
        fontCacheMemory.set(family, buffer);
        
        // Populate Cache API
        if (typeof caches !== 'undefined' && caches.default) {
          const res = new Response(buffer, {
            headers: {
              'Content-Type': 'font/ttf',
              'Cache-Control': 'public, max-age=31536000',
            }
          });
          await caches.default.put(cacheKey, res.clone()).catch(() => {});
        }
        
        console.log(`[FONT LOADER] Loaded ${family} from R2`);
        return buffer;
      }
    } catch (err) {
      console.warn("[FONT LOADER] R2 fetch failed:", err);
    }
  }

  // 3. Fallback to Google Fonts dynamically and write back to R2 + Cache API
  try {
    console.log(`[FONT LOADER] Fetching ${family} dynamically from Google Fonts`);
    const buffer = await downloadFontFromGoogle(family);
    if (buffer) {
      fontCacheMemory.set(family, buffer);

      // Save to R2
      if (env?.MEDIA_BUCKET) {
        await env.MEDIA_BUCKET.put(r2Key, buffer, {
          httpMetadata: { contentType: 'font/ttf' }
        }).catch((err) => console.error("[FONT LOADER] R2 save failed:", err));
      }

      // Save to Cache API
      if (typeof caches !== 'undefined' && caches.default) {
        const res = new Response(buffer, {
          headers: {
            'Content-Type': 'font/ttf',
            'Cache-Control': 'public, max-age=31536000',
          }
        });
        await caches.default.put(cacheKey, res.clone()).catch(() => {});
      }

      return buffer;
    }
  } catch (err) {
    console.error(`[FONT LOADER] Dynamic font fetch failed for ${family}:`, err);
  }

  // 4. Safely fall back to Inter if not the family itself
  if (family !== 'Inter') {
    console.warn(`[FONT LOADER] Falling back to Inter for family ${family}`);
    return loadFontBuffer('Inter', env);
  }

  return null;
}

async function downloadFontFromGoogle(family) {
  const cssRes = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400`);
  if (!cssRes.ok) return null;
  const cssText = await cssRes.text();
  const parts = cssText.split('/* latin */');
  const latinPart = parts[1] || parts[0];
  const match = latinPart.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!match) return null;
  const fontUrl = match[1];
  const fontRes = await fetch(fontUrl);
  if (!fontRes.ok) return null;
  return await fontRes.arrayBuffer();
}

function normalizeTemplate3(template) {
  const slots = [];
  const styles = template.global_overlay_styling || {};
  const font = styles.font_family || 'Inter';

  // Left pane image
  slots.push({
    slot_id: "left_pane_image",
    type: "image",
    content_key: "image_url",
    x: "0%", y: "0%", width: "50%", height: "100%",
    z_index: 1
  });

  // Left pane overlay text (e.g. BEFORE)
  slots.push({
    slot_id: "left_pane_text",
    type: "text",
    text: template.layout_structure?.left_pane?.overlay?.text || 'BEFORE',
    font: font,
    color: styles.color || '#FFFFFF',
    size: parseInt(styles.font_size) || 48,
    weight: styles.font_weight || '700',
    align: "center",
    x: "10%", y: "15%", width: "30%", height: "10%",
    z_index: 2
  });

  // Right pane image
  slots.push({
    slot_id: "right_pane_image",
    type: "image",
    content_key: "image_url_2",
    x: "50%", y: "0%", width: "50%", height: "100%",
    z_index: 1
  });

  // Right pane overlay text (e.g. AFTER)
  slots.push({
    slot_id: "right_pane_text",
    type: "text",
    text: template.layout_structure?.right_pane?.overlay?.text || 'AFTER',
    font: font,
    color: styles.color || '#FFFFFF',
    size: parseInt(styles.font_size) || 48,
    weight: styles.font_weight || '700',
    align: "center",
    x: "60%", y: "75%", width: "30%", height: "10%",
    z_index: 2
  });

  return slots;
}

function normalizeTemplate4(template) {
  const slots = [];
  const topZone = template.layout_structure?.top_zone || {};
  const bottomZone = template.layout_structure?.bottom_zone || {};

  // Top zone background
  slots.push({
    slot_id: "top_bg",
    type: "shape",
    fill: topZone.background || '#FFFFFF',
    x: "0%", y: "0%", width: "100%", height: "55%",
    z_index: 0
  });

  // Image Frame
  const frame = topZone.components?.image_frame || {};
  slots.push({
    slot_id: "image_frame",
    type: "image",
    content_key: "image_url",
    x: "20%", y: "8%", width: "60%", height: "40%",
    z_index: 1
  });

  // Badge header (e.g. BEST SELLER)
  const badge = topZone.components?.badge_header || {};
  if (badge.text) {
    slots.push({
      slot_id: "badge_header",
      type: "text",
      text: badge.text,
      font: badge.font_family || 'Inter',
      color: "brand.primary_color",
      size: parseInt(badge.font_size) || 24,
      align: "center",
      x: "10%", y: "3%", width: "80%", height: "5%",
      z_index: 2
    });
  }

  // Bottom zone background
  slots.push({
    slot_id: "bottom_bg",
    type: "shape",
    fill: bottomZone.background || '#FFFFFF',
    x: "0%", y: "55%", width: "100%", height: "45%",
    z_index: 0
  });

  // Product Name (Headline)
  const prod = bottomZone.components?.product_name || {};
  slots.push({
    slot_id: "product_name",
    type: "text",
    content_key: "headline",
    text: prod.text || '',
    font: prod.font_family || 'brand.heading_font',
    color: prod.color || 'brand.primary_color',
    size: parseInt(prod.font_size) || 36,
    align: "center",
    x: "10%", y: "58%", width: "80%", height: "8%",
    z_index: 2
  });

  // Features bullets (Body)
  const bullets = bottomZone.components?.feature_bullets || {};
  const bulletItems = bullets.items || [];
  slots.push({
    slot_id: "feature_bullets",
    type: "text",
    content_key: "body",
    text: bulletItems.join('\n') || '',
    font: bullets.font_family || 'brand.body_font',
    color: bullets.color || '#333333',
    size: parseInt(bullets.font_size) || 16,
    align: "center",
    x: "10%", y: "68%", width: "80%", height: "16%",
    z_index: 2
  });

  // CTA Button
  const btn = bottomZone.components?.cta_button || {};
  slots.push({
    slot_id: "cta_button",
    type: "cta_button",
    content_key: "cta",
    text: btn.text || 'Learn More',
    font: btn.font_family || 'brand.body_font',
    fill: btn.background_color || 'brand.primary_color',
    text_color: btn.text_color || '#FFFFFF',
    radius: parseInt(btn.border_radius) || 50,
    x: "35%", y: "86%", width: "30%", height: "8%",
    z_index: 2
  });

  return slots;
}

function normalizeTemplate5(template) {
  const slots = [];
  const struct = template.layout_structure || {};

  // Background
  slots.push({
    slot_id: "canvas_bg",
    type: "shape",
    fill: struct.background_color || '#1A1A1A',
    x: "0%", y: "0%", width: "100%", height: "100%",
    z_index: 0
  });

  // Decorative line
  const line = struct.decorative_components?.top_line || {};
  if (line.height) {
    slots.push({
      slot_id: "top_line",
      type: "shape",
      fill: line.background_color || '#FFFFFF',
      x: "10%", y: "8%", width: "10%", height: "1%",
      z_index: 1
    });
  }

  // Top meta row (left_link & right_label)
  const meta = struct.top_meta_row || {};
  if (meta.left_link) {
    slots.push({
      slot_id: "top_meta_left",
      type: "text",
      text: meta.left_link.text || '',
      font: "brand.body_font",
      color: meta.color || '#FFFFFF',
      size: parseInt(meta.left_link.font_size) || 18,
      align: "left",
      x: "10%", y: "11%", width: "40%", height: "4%",
      z_index: 1
    });
  }
  if (meta.right_label) {
    slots.push({
      slot_id: "top_meta_right",
      type: "text",
      text: meta.right_label.text || '',
      font: "brand.body_font",
      color: meta.color || '#FFFFFF',
      size: parseInt(meta.right_label.font_size) || 18,
      align: "right",
      x: "50%", y: "11%", width: "40%", height: "4%",
      z_index: 1
    });
  }

  // Numeral (01.)
  const num = struct.content_area?.headline_numeral || {};
  if (num.text) {
    slots.push({
      slot_id: "numeral",
      type: "text",
      text: num.text,
      font: num.font_family || 'brand.heading_font',
      color: num.color || '#FFFFFF',
      size: parseInt(num.font_size) || 120,
      align: num.alignment || "right",
      x: "10%", y: "18%", width: "80%", height: "15%",
      z_index: 2
    });
  }

  // Subtext body
  const body = struct.content_area?.subtext_body || {};
  slots.push({
    slot_id: "subtext_body",
    type: "text",
    content_key: "body",
    text: body.text || '',
    font: body.font_family || 'brand.body_font',
    color: body.color || '#E4E4E7',
    size: parseInt(body.font_size) || 28,
    align: body.alignment || "justify",
    x: "10%", y: "38%", width: "80%", height: "45%",
    z_index: 2
  });

  // Bottom action cta
  const cta = struct.bottom_action_row?.cta_center || {};
  slots.push({
    slot_id: "cta_center",
    type: "text",
    content_key: "cta",
    text: cta.text || '',
    font: cta.font_family || 'brand.body_font',
    color: cta.color || '#FFFFFF',
    size: parseInt(cta.font_size) || 24,
    align: "center",
    x: "10%", y: "86%", width: "80%", height: "6%",
    z_index: 2
  });

  return slots;
}

