import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { buildR2Key } from "./r2.js";

/**
 * myPilotPost — Media Engine (Core Phase 1)
 */

/* ======================================================
   HELPERS — LOCK ENFORCEMENT
   ====================================================== */
async function checkMediaLock(db, brandId, contentType, contentId) {
  const table = contentType === 'blog' ? 'blog_posts' : 'social_assets';
  const asset = await db.prepare(`SELECT status FROM ${table} WHERE id = ? AND brand_id = ?`).bind(contentId, brandId).first();
  
  if (asset?.status === 'scheduled' || asset?.status === 'published') {
     throw error("Media is locked for scheduled or published content", "MEDIA_LOCKED", null, 409);
  }
}

/* ======================================================
   INTERNAL — ATOMIC MEDIA REGISTRATION
 ====================================================== */
export async function registerMedia({
  env,
  brandId,
  provider,
  externalId,
  previewUrl,
  mimeType = "image",
}) {
  const db = getDB(env);

  // 1️⃣ IDEMPOTENCY CHECK (CRITICAL)
  const existing = await db
    .prepare(
      `SELECT id FROM media_assets WHERE brand_id = ? AND provider = ? AND external_id = ?`
    )
    .bind(brandId, provider, externalId)
    .first();

  if (existing) {
    return { id: existing.id, reused: true };
  }

  // 2️⃣ INSERT NEW ASSET
  const id = crypto.randomUUID();
  await db
    .prepare(
      `
    INSERT INTO media_assets (
      id, brand_id, provider, external_id, preview_url, mime_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    )
    .bind(id, brandId, provider, externalId, previewUrl, mimeType)
    .run();

  return { id, reused: false };
}

/* ======================================================
   POST /api/customer/media/from-pexels
 ====================================================== */
export async function registerPexelsMedia(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const { external_id, preview_url, type = "image" } = await req.json().catch(() => ({}));

  if (!external_id || !preview_url) {
    return error("external_id and preview_url required", 400);
  }

  const { id } = await registerMedia({
    env,
    brandId: auth.brand_id,
    provider: "pexels",
    externalId: external_id,
    previewUrl: preview_url,
    mimeType: type,
  });

  return json({ media_id: id });
}

/* ======================================================
   GET /api/customer/media/library
 ====================================================== */
export async function listMediaLibrary(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const url = new URL(req.url);
  const providerFilter = url.searchParams.get("provider");
  const searchQuery = url.searchParams.get("search");

  const db = getDB(env);
  let query = `SELECT * FROM media_assets WHERE brand_id = ?`;
  const params = [auth.brand_id];

  if (providerFilter) {
    query += ` AND provider = ?`;
    params.push(providerFilter);
  }

  if (searchQuery) {
    query += ` AND (external_id LIKE ? OR mime_type LIKE ?)`;
    params.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  query += ` ORDER BY created_at DESC`;

  const { results } = await db.prepare(query).bind(...params).all();

  return json({ items: results || [] });
}

/* ======================================================
   POST /api/customer/media/attach
 ====================================================== */
export async function attachMedia(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const { content_type, content_id, media_id } = await req.json().catch(() => ({}));

  if (!content_type || !content_id || !media_id) {
    return error("content_type, content_id, media_id required", 400);
  }

  const db = getDB(env);

  // 0️⃣ LOCK CHECK: Media cannot be modified for scheduled content
  await checkMediaLock(db, auth.brand_id, content_type, content_id);

  // 1️⃣ Brand Isolation: Verify media asset belongs to the active brand
  const media = await db
    .prepare("SELECT id FROM media_assets WHERE id = ? AND brand_id = ?")
    .bind(media_id, auth.brand_id)
    .first();

  if (!media) return error("Invalid media_id or unauthorized", 403);

  // 2️⃣ Blog Rule: Enforcement of single featured image
  if (content_type === 'blog') {
    await db.prepare(
      "DELETE FROM content_media_links WHERE content_id = ? AND content_type = 'blog' AND brand_id = ?"
    ).bind(content_id, auth.brand_id).run();
  }

  // 3️⃣ Ordering: Fetch next available position for this content
  const posRecord = await db.prepare(
    "SELECT COALESCE(MAX(position), 0) as max_pos FROM content_media_links WHERE content_id = ? AND content_type = ?"
  ).bind(content_id, content_type).first();
  const nextPos = (posRecord?.max_pos || 0) + 1;

  // 4️⃣ Insertion: Use INSERT OR IGNORE for idempotency (Unique constraint: content_id, content_type, media_id)
  const linkId = crypto.randomUUID();
  const result = await db
    .prepare(
      `
    INSERT OR IGNORE INTO content_media_links (
      id, brand_id, content_id, content_type, media_id, position, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    )
    .bind(linkId, auth.brand_id, content_id, content_type, media_id, nextPos)
    .run();

  // If ignore triggered, fetch existing linkId
  if (!result.meta.changes) {
     const existing = await db.prepare(
      "SELECT id FROM content_media_links WHERE content_id = ? AND content_type = ? AND media_id = ?"
     ).bind(content_id, content_type, media_id).first();
     return json({ success: true, link_id: existing?.id, reused: true });
  }

  return json({ success: true, link_id: linkId });
}

/* ======================================================
   POST /api/customer/media/detach
 ====================================================== */
export async function detachMedia(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const { content_id, media_id } = await req.json().catch(() => ({}));

  if (!content_id || !media_id) {
    return error("content_id and media_id required", 400);
  }

  const db = getDB(env);

  // 0️⃣ LOCK CHECK: Media cannot be modified for scheduled content
  // We need to know the content_type to check the lock. 
  // Let's find the link first to determine content_type if not provided.
  const link = await db.prepare(
    "SELECT content_type FROM content_media_links WHERE brand_id = ? AND content_id = ? AND media_id = ?"
  ).bind(auth.brand_id, content_id, media_id).first();

  if (link) {
    await checkMediaLock(db, auth.brand_id, link.content_type, content_id);
  }

  await db
    .prepare(
      "DELETE FROM content_media_links WHERE brand_id = ? AND content_id = ? AND media_id = ?"
    )
    .bind(auth.brand_id, content_id, media_id)
    .run();

  return json({ success: true, message: "Media detached" });
}

/* ======================================================
   GET /api/customer/media/attached/:type/:id
 ====================================================== */
export async function getAttachedMedia(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const { type, id: contentId } = req.params || {};
  if (!type || !contentId) return error("Missing type or content ID", "BAD_REQUEST", null, 400);
  const db = getDB(env);

  const { results } = await db
    .prepare(
      `
    SELECT m.*, l.id as link_id, l.position
    FROM media_assets m
    JOIN content_media_links l ON m.id = l.media_id
    WHERE l.brand_id = ? AND l.content_type = ? AND l.content_id = ?
    ORDER BY l.position ASC, l.created_at ASC
  `
    )
    .bind(auth.brand_id, type, contentId)
    .all();

  return json({ items: results || [] });
}

/* ======================================================
   POST /api/customer/media/upload
 ====================================================== */
export async function uploadMedia(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string") return error("No file provided", 400);

  const assetId = crypto.randomUUID();
  const filename = file.name || `upload-${assetId}`;
  const mimeType = file.type || "application/octet-stream";
  const r2Key = buildR2Key({ brandId: auth.brand_id, assetId, filename });

  const buffer = await file.arrayBuffer();
  await env.MEDIA_BUCKET.put(r2Key, buffer, {
    httpMetadata: { contentType: mimeType }
  });

  // Store absolute public URL so platform adapters (Instagram, etc.) can fetch it without auth
  const publicUrl = `${env.BASE_URL || "https://api.mypilotpost.com"}/api/media/file/${encodeURIComponent(r2Key)}`;

  const db = getDB(env);
  await db.prepare(`
    INSERT INTO media_assets (id, brand_id, provider, external_id, preview_url, mime_type, created_at)
    VALUES (?, ?, 'direct', ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(assetId, auth.brand_id, r2Key, publicUrl, mimeType).run();

  return json({ id: assetId, filename, mime_type: mimeType, preview_url: publicUrl });
}

/* ======================================================
   GET /api/customer/media/file/*key
 ====================================================== */
export async function serveMediaFile(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const url = new URL(req.url);
  const r2Key = decodeURIComponent(url.pathname.replace("/api/customer/media/file/", ""));

  if (!r2Key.startsWith(`brands/${auth.brand_id}/`)) {
    return error("Forbidden", 403);
  }

  const object = await env.MEDIA_BUCKET.get(r2Key);
  if (!object) return error("Not found", 404);

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

/* ======================================================
   GET /api/media/file/*key  (PUBLIC — no auth required)
   Security: R2 keys contain two UUIDs, unguessable without the key.
   Used by platform adapters (Instagram, etc.) to fetch media.
 ====================================================== */
export async function servePublicMediaFile(req, env) {
  const url = new URL(req.url);
  const r2Key = decodeURIComponent(url.pathname.replace("/api/media/file/", ""));

  if (!r2Key || r2Key === "/") return new Response("Not found", { status: 404 });

  const isHead = req.method === "HEAD";
  const object = isHead
    ? await env.MEDIA_BUCKET.head(r2Key)
    : await env.MEDIA_BUCKET.get(r2Key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(isHead ? null : object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    }
  });
}
