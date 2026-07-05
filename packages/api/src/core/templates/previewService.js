import { renderTemplateExact } from './exactRenderer.js';
import { uploadToR2 } from '../media/r2.js';

const PREVIEW_CACHE = new Map();

export async function getTemplatePreview(templateId, data, brandId, env) {
  const cacheKey = `${templateId}_${brandId}_${JSON.stringify(data)}`;
  
  if (PREVIEW_CACHE.has(cacheKey)) {
    return PREVIEW_CACHE.get(cacheKey);
  }
  
  // Render exact template
  const buffer = await renderTemplateExact(templateId, {
    ...data,
    brand_primary: data.primary_color || '#1A73E8',
    brand_secondary: data.secondary_color || '#34A853',
    brand_logo: data.logo_url || '',
    brand_font_headline: data.font_headline || 'Inter',
    brand_font_body: data.font_body || 'Inter'
  });

  const r2Key = `previews/${brandId}/${templateId}_${Date.now()}.webp`;
  
  // Upload to R2
  const r2Result = await uploadToR2(
    env,
    r2Key,
    buffer,
    'image/webp'
  );
  
  const url = `${env.BASE_URL || "https://api.mypilotpost.com"}/api/media/file/${r2Result.key}`;
  
  PREVIEW_CACHE.set(cacheKey, url);
  setTimeout(() => PREVIEW_CACHE.delete(cacheKey), 3600000); // 1 hour TTL
  
  return url;
}
