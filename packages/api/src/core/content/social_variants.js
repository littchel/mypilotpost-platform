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
    SELECT content_id
    FROM content_drafts
    WHERE content_id = ?
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

    await db.prepare(`
      INSERT INTO social_variants (
        social_asset_id,
        platform,
        body,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(social_asset_id, platform)
      DO UPDATE SET
        body = excluded.body,
        updated_at = CURRENT_TIMESTAMP
    `)
      .bind(assetId, platform, content)
      .run();
  }

  // 4️⃣ Touch draft for ordering
  await db.prepare(`
    UPDATE content_drafts
    SET updated_at = CURRENT_TIMESTAMP
    WHERE content_id = ?
      AND brand_id = ?
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
    SELECT content_id
    FROM content_drafts
    WHERE content_id = ?
      AND content_type = 'social'
      AND brand_id = ?
  `).bind(contentId, brand_id).first();

  if (!draft) {
    return json({ error: "Social draft not found" }, 404);
  }

  const { results } = await db.prepare(`
    SELECT platform, body
    FROM social_variants
    WHERE social_asset_id = ?
    ORDER BY platform ASC
  `).bind(contentId).all();

  const variants = {};
  for (const row of results || []) {
    variants[row.platform] = row.body;
  }

  return json({ variants });
}
