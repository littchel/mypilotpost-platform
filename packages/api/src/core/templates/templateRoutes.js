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
