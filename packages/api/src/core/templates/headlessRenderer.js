import { existsSync } from 'fs';
import puppeteer from 'puppeteer-core';
import crypto from 'crypto';

// In-memory cache for rendered thumbnail buffers
const bufferCache = new Map();
const CACHE_LIMIT = 200;

let browser = null;
let page = null;

/**
 * Computes a unique sha256 hash for a given request configuration
 */
function getParamsHash(templateSchema, slotData, brandVariables) {
  const payload = JSON.stringify({
    template_id: templateSchema?.template_id || '',
    slotData,
    brandVariables
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Self-healing detector for Chrome/Chromium installation executable paths
 */
function findChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const macPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ];
  for (const p of macPaths) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

/**
 * Returns a warm, active Puppeteer browser singleton instance
 */
async function getBrowserInstance() {
  if (browser) return browser;

  let executablePath;
  try {
    const p = await import('puppeteer');
    executablePath = p.executablePath();
  } catch {
    executablePath = findChromePath();
  }

  if (!executablePath) {
    throw new Error("[HEADLESS RENDERER] No suitable Chrome or Chromium executable found. Please set CHROME_PATH.");
  }

  browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
      '--enable-font-antialiasing'
    ]
  });
  return browser;
}

/**
 * Pre-warms and returns a Puppeteer Page instance with loaded Fabric.js and typography fonts
 */
async function getPageInstance() {
  if (page) return page;

  const b = await getBrowserInstance();
  page = await b.newPage();

  // Load Fabric.js and Google Fonts pre-connections
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
          canvas { display: block; }
        </style>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=Outfit:wght@400;700;800&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/fabric@6.0.1/dist/index.min.js"></script>
      </head>
      <body>
        <canvas id="canvas"></canvas>
      </body>
    </html>
  `);

  // Wait for the page evaluation context to load fabric.js globally
  await page.waitForFunction(() => typeof fabric !== 'undefined' || typeof fabric === 'object');
  return page;
}

/**
 * Headless Opportunity Card Renderer
 * Launches headless Chromium, constructs template canvas, draws slide 0 components, and takes a WebP screenshot.
 */
export async function renderOpportunityCard(templateSchema, slotData, brandVariables) {
  // 1. Check in-memory buffer cache
  const hash = getParamsHash(templateSchema, slotData, brandVariables);
  if (bufferCache.has(hash)) {
    return bufferCache.get(hash);
  }

  const p = await getPageInstance();
  const width = templateSchema?.dimensions?.width || 1080;
  const height = templateSchema?.dimensions?.height || 1080;

  // Set the viewport matching template definition dimensions
  await p.setViewport({ width, height });

  // Evaluate drawing commands inside the pre-warmed Puppeteer context
  await p.evaluate(async (schema, data, brandVars, w, h) => {
    const canvasEl = document.getElementById('canvas');
    canvasEl.width = w;
    canvasEl.height = h;

    // Clean up previous canvas instance if one exists to avoid memory leaks
    if (window.fCanvas) {
      window.fCanvas.dispose();
    }

    const f = window.fabric || fabric;
    const fCanvas = new f.Canvas('canvas', {
      width: w,
      height: h,
      backgroundColor: brandVars.secondary_color || "#F5F5F5",
      preserveObjectStacking: true
    });
    window.fCanvas = fCanvas;

    const activeSlide = schema.slides?.[0];
    if (!activeSlide) return;

    const components = activeSlide.components || [];
    const slotId = activeSlide.slot_id;
    const currentSlot = data[slotId] || {};
    const palette = currentSlot.palette || {};

    const primaryColor = brandVars.primary_color || "#1A1A1A";
    const secondaryColor = brandVars.secondary_color || "#F5F5F5";
    const fontStack = brandVars.font_stack || "Inter, sans-serif";
    const logoUrl = brandVars.logo_url || "";

    // Helper: Contrast Text color calculator
    const getContrastColor = (hex) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      if (!result) return "#000000";
      const r = parseInt(result[1], 16) / 255;
      const g = parseInt(result[2], 16) / 255;
      const b = parseInt(result[3], 16) / 255;
      const aR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const aG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const aB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
      const luminance = 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
      return luminance > 0.179 ? "#000000" : "#FFFFFF";
    };

    // Helper: Cross-version Fabric Image Loader (compatible with v5, v6, v7)
    const loadImageObj = async (url) => {
      const imgClass = f.FabricImage || f.Image;
      if (!imgClass) return null;
      try {
        const res = imgClass.fromURL(url, { crossOrigin: 'anonymous' });
        if (res && typeof res.then === 'function') {
          return await res;
        }
        return new Promise((resolve) => {
          imgClass.fromURL(url, (img) => resolve(img), { crossOrigin: 'anonymous' });
        });
      } catch {
        return null;
      }
    };

    // 1. Draw Background Rect
    const bgFill = palette.background || secondaryColor;
    const bgRect = new f.Rect({
      left: 0,
      top: 0,
      width: w,
      height: h,
      fill: bgFill,
      selectable: false
    });
    fCanvas.add(bgRect);

    // 2. Render other components sequentially sorted by z-index
    const sortedComps = [...components]
      .filter(c => c.type !== 'background')
      .sort((a, b) => (a.position?.z_index || 0) - (b.position?.z_index || 0));

    for (const comp of sortedComps) {
      const pos = comp.position || { x: 0, y: 0, width: 100, height: 100 };
      const cLeft = (pos.x / 100) * w;
      const cTop = (pos.y / 100) * h;
      const cW = (pos.width / 100) * w;
      const cH = (pos.height / 100) * h;

      if (comp.type === 'image') {
        const imgUrl = currentSlot.image_url || "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=640&q=80";
        const fImg = await loadImageObj(imgUrl);
        if (fImg) {
          fImg.set({
            left: cLeft,
            top: cTop,
            originX: 'left',
            originY: 'top',
            selectable: false
          });
          const scaleX = cW / fImg.width;
          const scaleY = cH / fImg.height;
          const scale = Math.max(scaleX, scaleY);
          fImg.scale(scale);

          const clipPath = new f.Rect({
            left: cLeft,
            top: cTop,
            width: cW,
            height: cH,
            absolutePositioned: true
          });
          fImg.clipPath = clipPath;

          fCanvas.add(fImg);
        }
      } 
      
      else if (['headline', 'subtitle', 'body', 'hashtags'].includes(comp.type)) {
        const textVal = currentSlot.text || 
          (comp.type === 'headline' ? 'Bold Narrative Headline' : 
           comp.type === 'subtitle' ? 'Subheading Copy' : 'Standard copy block');
        
        const fill = palette.text_contrast || primaryColor;
        const maxChars = comp.max_chars || 100;
        const baseSize = comp.type === 'headline' ? Math.round(h * 0.05) : Math.round(h * 0.03);
        const scaledSize = textVal.length > maxChars ? Math.round(baseSize * (maxChars / textVal.length)) : baseSize;

        const textBox = new f.Textbox(textVal, {
          left: cLeft,
          top: cTop,
          width: cW,
          fontSize: Math.max(scaledSize, 16),
          fontFamily: fontStack,
          fill,
          fontWeight: comp.type === 'headline' ? 'bold' : 'normal',
          textAlign: comp.type === 'headline' ? 'center' : 'left',
          splitByGrapheme: true,
          originX: 'left',
          originY: 'top',
          selectable: false
        });
        fCanvas.add(textBox);
      }

      else if (comp.type === 'logo' && logoUrl) {
        const fLogo = await loadImageObj(logoUrl);
        if (fLogo) {
          fLogo.set({
            left: cLeft,
            top: cTop,
            originX: 'left',
            originY: 'top',
            selectable: false
          });
          const scaleX = cW / fLogo.width;
          const scaleY = cH / fLogo.height;
          const scale = Math.min(scaleX, scaleY);
          fLogo.scale(scale);
          fCanvas.add(fLogo);
        }
      }

      else if (comp.type === 'cta_button') {
        const btnText = currentSlot.text || "Learn More";
        const btnBgColor = palette.accent || primaryColor;
        const btnTextColor = getContrastColor(btnBgColor);

        const bgRectObj = new f.Rect({
          left: cLeft,
          top: cTop,
          width: cW,
          height: cH,
          fill: btnBgColor,
          rx: 8,
          ry: 8,
          originX: 'left',
          originY: 'top',
          selectable: false
        });

        const label = new f.Text(btnText, {
          left: cLeft + cW / 2,
          top: cTop + cH / 2,
          fontSize: Math.round(cH * 0.4),
          fontFamily: fontStack,
          fill: btnTextColor,
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center',
          selectable: false
        });

        fCanvas.add(bgRectObj);
        fCanvas.add(label);
      }
    }

    fCanvas.renderAll();
  }, templateSchema, slotData, brandVariables, width, height);

  // Take screenshot as WebP image
  const screenshotResult = await p.screenshot({
    type: 'webp',
    quality: 90,
    omitBackground: true
  });
  const buffer = Buffer.from(screenshotResult);

  // LRU cache eviction
  if (bufferCache.size >= CACHE_LIMIT) {
    const firstKey = bufferCache.keys().next().value;
    bufferCache.delete(firstKey);
  }
  bufferCache.set(hash, buffer);

  return buffer;
}

/**
 * Clean up active browser and page instances on program close
 */
export async function closeHeadlessRenderer() {
  if (page) {
    await page.close();
    page = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
}
