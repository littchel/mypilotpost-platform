import { json } from "../../lib/json.js";

/**
 * POST /api/integrations/media/import
 * Store media metadata only (no binaries)
 */
export async function importMedia(request, env) {
  const body = await request.json();
  const {
    brand_id,
    provider,
    external_id,
    url,
    mime_type = null,
    width = null,
    height = null,
  } = body;

  if (!brand_id || !provider || !external_id || !url) {
    return json(
      { error: "brand_id, provider, external_id, and url are required" },
      400
    );
  }

  const id = crypto.randomUUID();

  await env.ADMIN_DB.prepare(`
    INSERT INTO media_assets (
      id,
      brand_id,
      provider,
      external_id,
      url,
      mime_type,
      width,
      height
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      brand_id,
      provider,
      external_id,
      url,
      mime_type,
      width,
      height
    )
    .run();

  return json(
    {
      id,
      brand_id,
      provider,
      url,
    },
    201
  );
}
