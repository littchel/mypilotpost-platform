// packages/api/src/api/admin/media.js
// Content → Media. Platform-wide asset operations. Source: media_assets + content_media_links.
// No duplication: assets are keyed by (provider, external_id); usage is traced via links.

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logAdminAction } from "../../lib/admin_logger.js";

const LICENSE = {
  direct:   "owned (uploaded)",
  upload:   "owned (uploaded)",
  pexels:   "free — attribution",
  adobe:    "Adobe licensed",
  freepik:  "Freepik licensed",
  overlay:  "derived (overlay)",
  generated:"AI-generated",
};

/**
 * GET /api/v1/admin/media
 * Library + provider panel + storage + licensing.
 */
export async function listAdminMedia(request, env) {
  const db  = getDB(env);
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "300"), 500);

  const where = provider ? "WHERE m.provider = ?" : "";
  const binds = provider ? [provider] : [];

  const { results } = await db.prepare(`
    SELECT
      m.id, m.provider, m.external_id, m.preview_url, m.mime_type, m.created_at,
      m.brand_id, m.user_id,
      b.name  AS brand_name,
      u.email AS owner_email,
      (SELECT COUNT(*) FROM content_media_links cml WHERE cml.media_id = m.id) AS usage_count
    FROM media_assets m
    LEFT JOIN brands b ON b.id = m.brand_id
    LEFT JOIN users  u ON u.id = m.user_id
    ${where}
    ORDER BY m.created_at DESC
    LIMIT ${limit}
  `).bind(...binds).all().catch(() => ({ results: [] }));

  const assets = (results || []).map(m => ({
    id: m.id,
    source: m.provider,
    provider_asset_id: m.external_id || null,
    preview_url: m.preview_url,
    mime_type: m.mime_type,
    license: LICENSE[m.provider] || "unknown",
    usage_count: m.usage_count || 0,
    owner: m.owner_email || m.brand_name || m.brand_id,
    brand_name: m.brand_name,
    created_at: m.created_at,
  }));

  // Provider panel — imports/requests per provider
  const { results: provRows } = await db.prepare(`
    SELECT provider, COUNT(*) AS imports, MAX(created_at) AS last_import
    FROM media_assets GROUP BY provider ORDER BY imports DESC
  `).all().catch(() => ({ results: [] }));
  const providers = (provRows || []).map(p => ({
    provider: p.provider, imports: p.imports, last_import: p.last_import,
    license: LICENSE[p.provider] || "unknown",
  }));

  // Storage breakdown by mime family
  const { results: storeRows } = await db.prepare(`
    SELECT
      CASE
        WHEN mime_type LIKE 'image/%' THEN 'image'
        WHEN mime_type LIKE 'video/%' THEN 'video'
        ELSE 'other' END AS kind,
      COUNT(*) AS count
    FROM media_assets GROUP BY kind
  `).all().catch(() => ({ results: [] }));

  return json({
    assets,
    providers,
    storage: { total: assets.length, by_kind: storeRows || [] },
    licensing: providers.map(p => ({ provider: p.provider, license: p.license, count: p.imports })),
  });
}

/**
 * GET /api/v1/admin/media/:id/usage
 * Trace where an asset is used (content links).
 */
export async function traceMediaUsage(request, env, mediaId) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT cml.content_id, cml.content_type, cml.role, cml.created_at, b.name AS brand_name
    FROM content_media_links cml
    LEFT JOIN brands b ON b.id = cml.brand_id
    WHERE cml.media_id = ?
    ORDER BY cml.created_at DESC LIMIT 100
  `).bind(mediaId).all().catch(() => ({ results: [] }));
  return json({ usage: results || [] });
}

/**
 * DELETE /api/v1/admin/media/:id
 * Remove an asset + its links. Audited. Blocks if still in use (safety).
 */
export async function deleteAdminMedia(request, env, auth, mediaId) {
  const db = getDB(env);
  const asset = await db.prepare("SELECT id, provider, external_id FROM media_assets WHERE id = ?").bind(mediaId).first();
  if (!asset) return error("Asset not found", "NOT_FOUND", null, 404);

  const inUse = await db.prepare("SELECT COUNT(*) AS n FROM content_media_links WHERE media_id = ?").bind(mediaId).first();
  if ((inUse?.n || 0) > 0)
    return error(`Asset is used by ${inUse.n} content item(s). Detach before deleting.`, "MEDIA_IN_USE", null, 409);

  await db.prepare("DELETE FROM media_assets WHERE id = ?").bind(mediaId).run();
  await logAdminAction(env, auth, "delete_media", "media_asset", mediaId, {
    provider: asset.provider, provider_asset_id: asset.external_id,
  });
  return json({ success: true });
}
