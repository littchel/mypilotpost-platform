import { getTemplate } from "./templateStore.js";
import { renderTemplateSlide } from "./headlessRenderer.js";

/**
 * Renders slide assets in parallel, handles timeouts/retries, and uploads final PNG/SVG files to R2.
 */
export async function generateFinalAsset(layout_manifest, brand_id, platform, job_id, env, customRenderer = null) {
  if (!layout_manifest || !brand_id || !job_id) {
    throw new Error("[ASSET GENERATOR] Invalid parameters: layout_manifest, brand_id, and job_id are required.");
  }

  const renderFn = customRenderer || renderTemplateSlide;

  // 1. Fetch template layout schema (core + variant)
  const templateId = layout_manifest.template_id;
  const variant = layout_manifest.template_variant;
  
  const coreTemplate = await getTemplate(templateId, env);
  if (!coreTemplate) {
    throw new Error(`[ASSET GENERATOR] Core template layout not found: ${templateId}`);
  }

  let finalSchema = { ...coreTemplate };
  if (variant) {
    const variantId = `${templateId}-${variant}`;
    const variantSchema = await getTemplate(variantId, env);
    if (variantSchema) {
      finalSchema = {
        ...coreTemplate,
        ...variantSchema,
        template_id: coreTemplate.template_id,
        variant_id: variant
      };
    }
  }

  // 2. Compute target dimensions based on target platform and format
  let dimensions = { width: 1080, height: 1080 };
  const platformLower = (platform || "").toLowerCase();
  const format = (finalSchema.format || "").toLowerCase();

  if (platformLower === "instagram") {
    if (format.includes("carousel")) {
      dimensions = { width: 1080, height: 1350 };
    } else if (format.includes("story") || format.includes("fullscreen")) {
      dimensions = { width: 1080, height: 1920 };
    } else {
      dimensions = { width: 1080, height: 1080 };
    }
  } else if (platformLower === "linkedin") {
    if (format.includes("carousel") || format.includes("story") || format.includes("portrait")) {
      dimensions = { width: 1080, height: 1350 };
    } else {
      dimensions = { width: 1080, height: 565 };
    }
  } else if (platformLower === "facebook") {
    dimensions = { width: 1080, height: 1080 };
  } else if (platformLower === "tiktok" || platformLower.includes("story") || format.includes("story")) {
    dimensions = { width: 1080, height: 1920 };
  }

  // Map slide inputs
  const brandOverrides = layout_manifest.brand_overrides || {};
  const brandVariables = {
    primary_color: brandOverrides.primary_color || "#1A1A1A",
    secondary_color: brandOverrides.secondary_color || "#F5F5F5",
    font_stack: brandOverrides.font_stack || "Inter, sans-serif",
    logo_url: brandOverrides.logo_url || ""
  };

  const manifestSlides = Array.isArray(layout_manifest.slides) ? layout_manifest.slides : [];
  const slideCount = Math.max(manifestSlides.length, 1);
  const assetUrls = [];

  // Helper retry/timeout function wrapper
  const renderWithRetryAndTimeout = async (slideIndex, slideData) => {
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout exceeded")), 30000)
        );
        const renderPromise = renderFn(finalSchema, slideData, brandVariables, slideIndex, dimensions);
        return await Promise.race([renderPromise, timeoutPromise]);
      } catch (err) {
        lastError = err;
        console.warn(`[ASSET GENERATOR] Attempt ${attempt} failed for slide index ${slideIndex}:`, err.message);
        if (attempt === 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    throw lastError;
  };

  // 3. Render slide pages in parallel using Promise.all
  const renderPromises = Array.from({ length: slideCount }).map(async (_, idx) => {
    const slideManifest = manifestSlides[idx] || {};
    const slideId = slideManifest.slot_id || `slide_${idx + 1}`;
    
    const slideData = {
      [slideId]: {
        text: slideManifest.text || "",
        image_url: slideManifest.image_url || "",
        palette: {
          dominant: brandVariables.primary_color,
          accent: brandVariables.secondary_color,
          background: "#F5F5F5",
          text_contrast: "#FFFFFF"
        }
      }
    };

    let buffer;
    let isSvg = false;
    let r2Key = `brands/${brand_id}/deliveries/${job_id}/${idx}.png`;
    let contentType = "image/png";

    try {
      buffer = await renderWithRetryAndTimeout(idx, slideData);
    } catch (renderError) {
      console.error(`[ASSET GENERATOR] All render attempts failed for slide ${idx}. Generating SVG fallback:`, renderError.message);
      
      // Fallback SVG representation
      const textVal = slideManifest.text || "Social Post Slide Preview";
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimensions.width} ${dimensions.height}" width="${dimensions.width}" height="${dimensions.height}">
        <rect width="100%" height="100%" fill="${brandVariables.secondary_color}"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="${brandVariables.primary_color}">
          ${textVal}
        </text>
      </svg>`;
      
      buffer = Buffer.from(svgString, "utf8");
      isSvg = true;
      r2Key = `brands/${brand_id}/deliveries/${job_id}/${idx}.svg`;
      contentType = "image/svg+xml";
    }

    // 4. Upload rendered PNG/SVG buffer to Cloudflare R2
    if (env?.MEDIA_BUCKET) {
      await env.MEDIA_BUCKET.put(r2Key, buffer, {
        httpMetadata: { contentType }
      });
      const baseUrl = env.BASE_URL || "https://api.mypilotpost.com";
      return `${baseUrl}/api/media/file/${r2Key}`;
    } else {
      // Offline fallback mapping path
      return `/api/media/file/${r2Key}`;
    }
  });

  const urls = await Promise.all(renderPromises);
  
  let returnFormat = "feed";
  if (format.includes("carousel")) returnFormat = "carousel";
  else if (format.includes("story") || format.includes("fullscreen")) returnFormat = "story";
  else if (format.includes("reel")) returnFormat = "reel";

  return {
    asset_urls: urls,
    format: returnFormat
  };
}
