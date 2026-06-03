// packages/api/src/core/content/social_variants.js

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/* ======================================================
   SOCIAL VARIANTS (FINAL, CORRECT)
   - content_drafts is authoritative
   - content_id === social_assets.id
====================================================== */

/**
 * PUT /api/customer/content/social/:id/variants
 */
export async function saveSocialVariants(request, env, contentId, ctx) {
  const auth = ctx?.auth ?? ctx;
  const { brand_id } = auth || {};

  if (!brand_id) return json({ error: "Unauthorized" }, 401);

  const body = await request.json();
  const variants = body?.variants;

  if (!variants || typeof variants !== "object") {
    return json({ error: "variants object is required" }, 400);
  }

  const db = getDB(env);

  // 1️⃣ Verify draft exists and is social
  const draft = await db.prepare(`
    SELECT id AS content_id
    FROM content_vault
    WHERE id = ?
      AND content_type = 'social'
      AND brand_id = ?
  `).bind(contentId, brand_id).first();

  if (!draft) {
    return json({ error: "Social draft not found" }, 404);
  }

  // 2️⃣ content_id IS the social_assets.id
  const assetId = contentId;

  // 3️⃣ Upsert variants
  for (const [platform, content] of Object.entries(variants)) {
    if (!platform || typeof content !== "string") continue;

    const existing = await db.prepare(`
      SELECT id FROM social_variants
      WHERE social_asset_id = ? AND platform = ?
    `).bind(assetId, platform).first();

    if (existing) {
      await db.prepare(`
        UPDATE social_variants
        SET caption = ?
        WHERE id = ?
      `).bind(content, existing.id).run();
    } else {
      await db.prepare(`
        INSERT INTO social_variants (id, social_asset_id, platform, caption)
        VALUES (?, ?, ?, ?)
      `).bind(crypto.randomUUID(), assetId, platform, content).run();
    }
  }

  await db.prepare(`
    UPDATE content_vault SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?
  `).bind(contentId, brand_id).run();

  return json({ saved: true });
}

/**
 * GET /api/customer/content/social/:id/variants
 */
export async function getSocialVariants(_req, env, contentId, ctx) {
  const auth = ctx?.auth ?? ctx;
  const { brand_id } = auth || {};

  if (!brand_id) return json({ error: "Unauthorized" }, 401);

  const db = getDB(env);

  // Verify draft exists
  const draft = await db.prepare(`
    SELECT id AS content_id
    FROM content_vault
    WHERE id = ?
      AND content_type = 'social'
      AND brand_id = ?
  `).bind(contentId, brand_id).first();

  if (!draft) {
    return json({ error: "Social draft not found" }, 404);
  }

  const { results } = await db.prepare(`
    SELECT platform, caption
    FROM social_variants
    WHERE social_asset_id = ?
    ORDER BY platform ASC
  `).bind(contentId).all();

  const variants = {};
  for (const row of results || []) {
    variants[row.platform] = row.caption;
  }

  return json({ variants });
}
