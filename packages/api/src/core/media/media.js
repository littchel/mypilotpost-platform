import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/* ======================================================
   INTERNAL — REGISTER MEDIA (EXTERNAL PROVIDERS ONLY)
====================================================== */
export async function registerMedia({
  env,
  brandId,
  provider,
  externalId,
  previewUrl,
  type,
  aspectRatio = null,
  duration = null,
  recommendedPlatforms = null,
}) {
  const db = getDB(env);
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO media_assets (
      id,
      brand_id,
      provider,
      external_id,
      preview_url,
      type,
      aspect_ratio,
      duration,
      recommended_platforms,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    id,
    brandId,
    provider,
    externalId,
    previewUrl,
    type,
    aspectRatio,
    duration,
    recommendedPlatforms
  ).run();

  return { id };
}

/* ======================================================
   POST /api/customer/media/from-freepik
   CANON 3 — FREEPIK MEDIA REGISTRATION (PATCHED)
====================================================== */
export async function registerFreepikMedia(req, env, auth) {
  if (!auth?.brand_id) {
    return error("Unauthorized", 401);
  }

  const {
    external_id,
    preview_url,
    type = "image",
    aspect_ratio = null,
    attribution_text = null,
    license = null
  } = await req.json().catch(() => ({}));

  if (!external_id || !preview_url) {
    return error("external_id and preview_url required", 400);
  }

  const db = getDB(env);

  /* ---- idempotency: reuse if already imported ---- */
  const existing = await db.prepare(`
    SELECT id
    FROM media_assets
    WHERE brand_id = ?
      AND provider = 'freepik'
      AND external_id = ?
  `).bind(auth.brand_id, external_id).first();

  if (existing) {
    return json({ media_id: existing.id });
  }

  /* ---- register media asset ---- */
  const { id: mediaId } = await registerMedia({
    env,
    brandId: auth.brand_id,
    provider: "freepik",
    externalId: external_id,
    previewUrl: preview_url,
    type,
    aspectRatio: aspect_ratio
  });

  /* ---- attribution (non-blocking) ---- */
  if (attribution_text || license) {
    await db.prepare(`
      INSERT INTO media_attribution_events (
        id,
        media_id,
        provider,
        attribution_text,
        license,
        used_in,
        created_at
      )
      VALUES (?, ?, 'freepik', ?, ?, NULL, CURRENT_TIMESTAMP)
    `).bind(
      crypto.randomUUID(),
      mediaId,
      attribution_text,
      license
    ).run();
  }

  return json({ media_id: mediaId });
}

/* ======================================================
   EXISTING MEDIA API (UNCHANGED)
====================================================== */
export async function uploadMedia() {
  return error(
    "Direct uploads are not enabled. Use external sources (Canva / Drive).",
    501
  );
}

export async function listMedia(_req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT *
    FROM media_assets
    WHERE brand_id = ?
    ORDER BY created_at DESC
  `).bind(auth.brand_id).all();

  return json({ items: results || [] });
}

export async function attachMedia(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const { content_type, content_id, media_id, role } =
    await req.json().catch(() => ({}));

  if (!content_type || !content_id || !media_id) {
    return error("content_type, content_id, media_id required", 400);
  }

  const db = getDB(env);

  const media = await db.prepare(`
    SELECT id FROM media_assets
    WHERE id = ? AND brand_id = ?
  `).bind(media_id, auth.brand_id).first();

  if (!media) return error("Invalid media_id", 403);

  const existing = await db.prepare(`
    SELECT id FROM content_media_links
    WHERE brand_id = ?
      AND content_type = ?
      AND content_id = ?
      AND media_id = ?
  `).bind(
    auth.brand_id,
    content_type,
    content_id,
    media_id
  ).first();

  if (existing) return json({ success: true });

  await db.prepare(`
    INSERT INTO content_media_links (
      id,
      brand_id,
      content_type,
      content_id,
      media_id,
      role,
      locked,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
  `).bind(
    crypto.randomUUID(),
    auth.brand_id,
    content_type,
    content_id,
    media_id,
    role || null
  ).run();

  return json({ success: true });
}

export async function detachMedia(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const { content_type, content_id, media_id } =
    await req.json().catch(() => ({}));

  if (!content_type || !content_id || !media_id) {
    return error("content_type, content_id, media_id required", 400);
  }

  const db = getDB(env);

  const link = await db.prepare(`
    SELECT locked FROM content_media_links
    WHERE brand_id = ?
      AND content_type = ?
      AND content_id = ?
      AND media_id = ?
  `).bind(
    auth.brand_id,
    content_type,
    content_id,
    media_id
  ).first();

  if (!link) return json({ success: true });
  if (link.locked === 1) return error("MEDIA_LOCKED", 409);

  await db.prepare(`
    DELETE FROM content_media_links
    WHERE brand_id = ?
      AND content_type = ?
      AND content_id = ?
      AND media_id = ?
  `).bind(
    auth.brand_id,
    content_type,
    content_id,
    media_id
  ).run();

  return json({ success: true });
}
