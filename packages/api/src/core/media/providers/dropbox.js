import { json, error } from "../../../lib/json.js";
import { registerMedia } from "../media.js";

/**
 * POST /api/customer/media/from-dropbox
 */
export async function importFromDropbox(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const {
    path,
    preview_url,
    type = "image",
    aspect_ratio = null
  } = await req.json().catch(() => ({}));

  if (!path || !preview_url) {
    return error("path and preview_url required", 400);
  }

  const media = await registerMedia({
    env,
    brandId: auth.brand_id,
    provider: "dropbox",
    externalId: path,
    previewUrl: preview_url,
    type,
    aspectRatio: aspect_ratio
  });

  return json({ media_id: media.id });
}
