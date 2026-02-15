import { json, error } from "../../../lib/json.js";
import { registerMedia } from "../media.js";

/**
 * POST /api/customer/media/from-google-drive
 * Canon 3 — metadata-only registration
 *
 * Body:
 * {
 *   "file_id": "...",
 *   "preview_url": "...",
 *   "type": "image",
 *   "aspect_ratio": "1:1"
 * }
 */
export async function importFromGoogleDrive(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const {
    file_id,
    preview_url,
    type = "image",
    aspect_ratio = null
  } = await req.json().catch(() => ({}));

  if (!file_id || !preview_url) {
    return error("file_id and preview_url required", 400);
  }

  // 🔒 Canon 3: NO downloads, NO Google API calls
  const media = await registerMedia({
    env,
    brandId: auth.brand_id,
    provider: "google_drive",
    externalId: file_id,
    previewUrl: preview_url,
    type,
    aspectRatio: aspect_ratio
  });

  return json({ media_id: media.id });
}
