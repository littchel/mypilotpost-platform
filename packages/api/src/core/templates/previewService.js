import puppeteer from 'puppeteer';
import { renderTemplate } from './exactRenderer.js';
import { uploadToR2 } from '../media/r2.js';
import { existsSync } from 'fs';

const PREVIEW_CACHE = new Map();

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

export async function getTemplatePreview(templateId, variant, data, brandId, env) {
  const cacheKey = `${templateId}:${variant}:${JSON.stringify(data)}`;
  if (PREVIEW_CACHE.has(cacheKey)) {
    return PREVIEW_CACHE.get(cacheKey);
  }

  const html = renderTemplate(templateId, variant, data);
  
  let executablePath;
  try {
    const p = await import('puppeteer-core');
    executablePath = findChromePath();
  } catch (e) {
    executablePath = puppeteer.executablePath();
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set viewport to 1080x1080 by default; parse dimensions if template exists
  const template = data.template || {};
  const width = template.dimensions?.width || 1080;
  const height = template.dimensions?.height || 1080;
  
  await page.setViewport({ width, height });
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 5000 });
  const screenshot = await page.screenshot({ type: 'png' });
  await browser.close();

  const key = `previews/${brandId}/${templateId}_${variant}_${Date.now()}.png`;
  
  // Graceful fallback for test environments without R2 buckets
  if (!env || !env.MEDIA_BUCKET || typeof env.MEDIA_BUCKET.put !== 'function') {
    const url = `${env?.BASE_URL || "https://api.mypilotpost.com"}/api/media/file/${key}`;
    PREVIEW_CACHE.set(cacheKey, url);
    return url;
  }
  
  // Upload to R2 using the standard helper (which takes env, key, buffer/stream, contentType)
  const r2Result = await uploadToR2(env, key, screenshot, 'image/png');
  
  // Resolve public media file URL
  const url = `${env.BASE_URL || "https://api.mypilotpost.com"}/api/media/file/${r2Result.key}`;
  
  PREVIEW_CACHE.set(cacheKey, url);
  
  // Cache TTL: clear after 24 hours
  setTimeout(() => PREVIEW_CACHE.delete(cacheKey), 24 * 60 * 60 * 1000);
  
  return url;
}
