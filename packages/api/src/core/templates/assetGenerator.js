import { renderTemplateSlides } from "./renderer.js";
import { TEMPLATE_NOT_CERTIFIED } from "./errors.js";
import { validateManifestOrThrow } from "./manifest.js";

/**
 * Production asset generation. Uses the canonical renderer only.
 * Unknown templates fail closed — nothing is substituted.
 */
export async function generateFinalAsset(layout_manifest, brand_id, _platform, job_id, env) {
  if (!layout_manifest || !brand_id || !job_id) {
    throw new Error("[ASSET GENERATOR] layout_manifest, brand_id, and job_id are required.");
  }
  let template;
  try {
    template = validateManifestOrThrow(layout_manifest, { requireMedia: true });
  } catch (err) {
    err.code = err.code || TEMPLATE_NOT_CERTIFIED;
    throw err;
  }

  const slides = Array.isArray(layout_manifest.slides) && layout_manifest.slides.length
    ? layout_manifest.slides
    : [{}];
  const pngs = await renderTemplateSlides(template.id, slides, brand_id, env);
  const asset_urls = [];

  for (let idx = 0; idx < pngs.length; idx++) {
    const r2Key = `deliveries/${job_id}/${idx}.png`;
    if (env.MEDIA_BUCKET) {
      await env.MEDIA_BUCKET.put(r2Key, pngs[idx], { httpMetadata: { contentType: "image/png" } });
    }
    const base = env.BASE_URL || "https://api.mypilotpost.com";
    asset_urls.push(`${base}/api/media/file/${r2Key}`);
  }

  return { asset_urls, template_id: template.id };
}
