import { json } from "../../lib/json.js";

/**
 * POST /api/content/social/:id/media
 * Attach media to a social asset
 */
export async function attachMediaToSocial(request, env, socialAssetId) {
  try {
    const { media_asset_id } = await request.json();

    if (!media_asset_id) {
      return json({ error: "media_asset_id is required" }, 400);
    }

    /* Ensure social asset exists */
    const social = await env.mypilotpost.prepare(`
      SELECT id, brand_id
      FROM social_assets
      WHERE id = ?
    `)
      .bind(socialAssetId)
      .first();

    if (!social) {
      return json({ error: "Social asset not found" }, 404);
    }

    /* Ensure media exists */
    const media = await env.mypilotpost.prepare(`
      SELECT id
      FROM media_assets
      WHERE id = ?
    `)
      .bind(media_asset_id)
      .first();

    if (!media) {
      return json({ error: "Media asset not found" }, 404);
    }

    /* Attach (idempotent via PK) */
    await env.mypilotpost.prepare(`
      INSERT OR IGNORE INTO social_media_links (
        social_asset_id,
        media_asset_id
      ) VALUES (?, ?)
    `)
      .bind(socialAssetId, media_asset_id)
      .run();

    /* Emit mission */
    await env.mypilotpost.prepare(`
      INSERT INTO missions (
        id,
        brand_id,
        type,
        entity_type,
        entity_id
      ) VALUES (?, ?, 'media_attached', 'social_asset', ?)
    `)
      .bind(
        crypto.randomUUID(),
        social.brand_id,
        socialAssetId
      )
      .run();

    return json({ attached: true }, 201);
  } catch (err) {
    return json(
      {
        error: "Media attachment failed",
        detail: String(err?.message || err)
      },
      500
    );
  }
}

/**
 * GET /api/content/social/:id/media
 * List media attached to a social asset
 */
export async function listSocialMedia(request, env, socialAssetId) {
  /* Ensure social asset exists */
  const social = await env.mypilotpost.prepare(`
    SELECT id
    FROM social_assets
    WHERE id = ?
  `)
    .bind(socialAssetId)
    .first();

  if (!social) {
    return json({ error: "Social asset not found" }, 404);
  }

  const { results } = await env.mypilotpost.prepare(`
    SELECT
      m.id,
      m.provider,
      m.preview_url,
      m.type,
      m.aspect_ratio
    FROM social_media_links sml
    JOIN media_assets m
      ON m.id = sml.media_asset_id
    WHERE sml.social_asset_id = ?
  `)
    .bind(socialAssetId)
    .all();

  return json({ media: results });
}
