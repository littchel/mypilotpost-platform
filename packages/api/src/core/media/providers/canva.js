import { json, error } from "../../../lib/json.js";
import { registerMedia } from "../media.js";

/*
POST /api/customer/media/from-canva
Body:
{
  "asset_id": "...",
  "preview_url": "...",
  "type": "image",
  "aspect_ratio": "1:1"
}
*/
export async function importFromCanva(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const {
    asset_id,
    preview_url,
    type = "image",
    aspect_ratio = null
  } = await req.json().catch(() => ({}));

  if (!asset_id || !preview_url) {
    return error("asset_id and preview_url required", 400);
  }

  const media = await registerMedia({
    env,
    brandId: auth.brand_id,
    provider: "canva",
    externalId: asset_id,
    previewUrl: preview_url,
    type,
    aspectRatio: aspect_ratio
  });

  return json({ media_id: media.id });
}
