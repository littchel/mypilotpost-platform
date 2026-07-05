import { json, error } from "../../lib/json.js";
import { getTemplate } from "./templateStore.js";
import { validateTemplate } from "./schema.js";

/**
 * Serves template schemas, dynamically merging variant styling overrides when requested.
 * GET /api/customer/templates/:template_id/:variant?
 */
export async function getTemplateWithVariant(request, env, auth) {
  if (!auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  const url = new URL(request.url);
  const suffix = url.pathname.replace(/^\/api\/customer\/templates\//, "");
  const parts = suffix.split("/").filter(Boolean);

  const templateId = parts[0];
  const variant = parts[1] || null;

  if (!templateId) {
    return error("Template ID is required", "BAD_REQUEST", null, 400);
  }

  const cacheKey = `template:${templateId}:${variant || "default"}`;

  // 1. Try Redis cache first
  if (env.REDIS_CLIENT) {
    try {
      const cached = await env.REDIS_CLIENT.get(cacheKey);
      if (cached) {
        return json(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("[TEMPLATES ENDPOINT] Redis cache get failed:", e.message);
    }
  }

  // 2. Load core template
  let coreTemplate;
  try {
    coreTemplate = await getTemplate(templateId, env);
    if (!coreTemplate || (coreTemplate.template_id === "tpl_feed_generic_default" && templateId !== "tpl_feed_generic_default")) {
      return error(`Template not found: ${templateId}`, "NOT_FOUND", null, 404);
    }
  } catch (err) {
    return error(`Template not found: ${templateId}`, "NOT_FOUND", null, 404);
  }

  let finalSchema = { ...coreTemplate };

  // 3. Load & merge variant styling overrides if provided
  if (variant) {
    const variantId = `${templateId}-${variant}`;
    let variantSchema;
    try {
      variantSchema = await getTemplate(variantId, env);
      if (!variantSchema || variantSchema.template_id === "tpl_feed_generic_default") {
        return error(`Variant not found: ${variant} for template ${templateId}`, "NOT_FOUND", null, 404);
      }
    } catch (err) {
      return error(`Variant not found: ${variant} for template ${templateId}`, "NOT_FOUND", null, 404);
    }

    // Merge overrides on top of core template structure
    finalSchema = {
      ...coreTemplate,
      ...variantSchema,
      template_id: coreTemplate.template_id, // retain core template_id
      variant_id: variant // track variant ID
    };
  }

  // 4. Validate output schema against Zod definitions
  const validation = validateTemplate(finalSchema);
  if (!validation.success) {
    return error(
      `Merged schema validation failed: ${JSON.stringify(validation.error.format())}`,
      "VALIDATION_ERROR",
      null,
      500
    );
  }

  const validatedSchema = validation.data;

  // 5. Save to Redis Cache (1 hour TTL)
  if (env.REDIS_CLIENT) {
    try {
      await env.REDIS_CLIENT.setEx(cacheKey, 60 * 60, JSON.stringify(validatedSchema));
    } catch (e) {
      console.warn("[TEMPLATES ENDPOINT] Redis cache set failed:", e.message);
    }
  }

  return json(validatedSchema);
}

/**
 * Renders a single visual slide as a flattened PNG.
 * Checks R2 cache first based on parameter content-hash to enable lightning-fast cache hits.
 * GET /api/customer/templates/render-preview
 */
export async function getTemplatePreviewImage(request, env, auth) {
  if (!auth?.brand_id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const templateId = url.searchParams.get("template_id");
  const variant = url.searchParams.get("variant") || "A";
  const headline = url.searchParams.get("headline") || "";
  const body = url.searchParams.get("body") || "";
  const cta = url.searchParams.get("cta") || "Learn More";
  const imageUrl = url.searchParams.get("image_url") || "";

  if (!templateId) {
    return new Response("Template ID is required", { status: 400 });
  }

  // 1. Compute content hash deterministically
  const hashStr = `${templateId}-${variant}-${auth.brand_id}-${headline}-${body}-${cta}-${imageUrl}`;
  let hash = 2166136261;
  for (let i = 0; i < hashStr.length; i++) {
    hash ^= hashStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const contentHash = (hash >>> 0).toString(16);
  const r2Key = `renders/preview-${auth.brand_id}-${templateId}-${variant}-${contentHash}.png`;

  // 2. Try R2 cache first
  if (env.MEDIA_BUCKET) {
    try {
      const existing = await env.MEDIA_BUCKET.get(r2Key);
      if (existing) {
        return new Response(existing.body, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
            "X-Cache": "HIT"
          }
        });
      }
    } catch (e) {
      console.warn("[PREVIEW ENDPOINT] R2 check failed:", e.message);
    }
  }

  // 3. Load core template schema
  let coreTemplate;
  try {
    coreTemplate = await getTemplate(templateId, env);
    if (!coreTemplate || coreTemplate.template_id === "tpl_feed_generic_default") {
      return new Response("Template not found", { status: 404 });
    }
  } catch (err) {
    return new Response("Template not found", { status: 404 });
  }

  let finalSchema = { ...coreTemplate };

  // 4. Merge variant overrides if applicable
  if (variant && variant !== "default") {
    const variantId = `${templateId}-${variant}`;
    try {
      const variantSchema = await getTemplate(variantId, env);
      if (variantSchema && variantSchema.template_id !== "tpl_feed_generic_default") {
        finalSchema = {
          ...coreTemplate,
          ...variantSchema,
          template_id: coreTemplate.template_id,
          variant_id: variant
        };
      }
    } catch (err) {
      // Ignore variant overrides error and fall back to core template
    }
  }

  // 5. Render dynamically
  let pngBuffer;
  try {
    const { renderTemplateSlides } = await import("./flattenRenderer.js");
    const pngs = await renderTemplateSlides(
      finalSchema,
      [{ headline, body, cta, image_url: imageUrl, image_url_2: imageUrl }],
      auth.brand_id,
      env
    );
    pngBuffer = pngs[0];
  } catch (err) {
    console.error("[PREVIEW ENDPOINT] Render failed:", err.message);
    return new Response(`Render failed: ${err.message}`, { status: 500 });
  }

  if (!pngBuffer) {
    return new Response("Empty render result", { status: 500 });
  }

  // 6. Write back to R2 cache asynchronously
  if (env.MEDIA_BUCKET) {
    env.MEDIA_BUCKET.put(r2Key, pngBuffer, {
      httpMetadata: { contentType: "image/png" }
    }).catch(err => console.error("[PREVIEW ENDPOINT] R2 save failed:", err.message));
  }

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "X-Cache": "MISS"
    }
  });
}

