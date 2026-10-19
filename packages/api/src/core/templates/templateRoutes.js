import { json, error } from "../../lib/json.js";
import { getCertifiedTemplate, listCertifiedTemplates, requireCertifiedTemplate } from "./registry.js";
import { renderTemplateFlat } from "./renderer.js";
import { TEMPLATE_NOT_CERTIFIED, TEMPLATE_RENDER_FAILED } from "./errors.js";

export function computePreviewR2Key(brandId, templateId, _variant, headline, body, cta, imageUrl, stamp = "") {
  const raw = `${brandId}|${templateId}|${stamp}|${headline}|${body}|${cta}|${imageUrl}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `previews/${brandId}/${templateId}-${(h >>> 0).toString(16)}.png`;
}

export async function renderPreviewBuffer({ brandId, templateId, headline = "", body = "", cta = "", imageUrl = "" }, env) {
  requireCertifiedTemplate(templateId);
  return renderTemplateFlat(templateId, { headline, body, cta, image: imageUrl }, brandId, env);
}

export async function getTemplateWithVariant(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const url = new URL(request.url);
  const suffix = url.pathname.replace(/^\/api\/customer\/templates\//, "");
  const templateId = suffix.split("/").filter(Boolean)[0];
  if (!templateId || templateId === "render-preview") {
    return json({
      templates: listCertifiedTemplates().map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        contentType: t.contentType,
        format: t.format,
        canvas: t.canvas,
        supportedFormats: t.supportedFormats,
        slideCount: t.slides.length,
        mediaRequired: t.slides.some((s) => s.slots.some((slot) => slot.type === "media" && slot.required === true)),
      })),
    });
  }
  const template = getCertifiedTemplate(templateId);
  if (!template) {
    return error(`TEMPLATE_NOT_CERTIFIED: ${templateId}`, TEMPLATE_NOT_CERTIFIED, null, 404);
  }
  return json({ ...template, coordinateSpace: "px" });
}

export async function getTemplatePreviewImage(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const url = new URL(request.url);
  const templateId = url.searchParams.get("template_id") || url.searchParams.get("templateId");
  const headline = url.searchParams.get("headline") || "";
  const body = url.searchParams.get("body") || "";
  const cta = url.searchParams.get("cta") || "";
  const imageUrl = url.searchParams.get("image_url") || url.searchParams.get("imageUrl") || "";
  try {
    const png = await renderPreviewBuffer({
      brandId: auth.brand_id, templateId, headline, body, cta, imageUrl,
    }, env);
    return new Response(png, { headers: { "Content-Type": "image/png" } });
  } catch (err) {
    const code = err.code || TEMPLATE_RENDER_FAILED;
    const status = code === TEMPLATE_NOT_CERTIFIED ? 404 : 422;
    return error(err.message, code, err.details || null, status);
  }
}
