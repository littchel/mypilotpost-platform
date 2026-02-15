/**
 * myPilotPost — Media Suggestions Controller
 * AUTHORITATIVE • v1 SAFE • WORKERS COMPATIBLE
 */

import { json } from "../../../lib/json.js";
import { getDB } from "../../../lib/db.js";
import { suggestMedia } from "./media_suggest.js";

/**
 * POST /api/customer/media/suggestions
 *
 * Query params:
 *  - content_id
 *  - platform
 */
export async function getMediaSuggestions(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const contentId = url.searchParams.get("content_id");
  const platform = url.searchParams.get("platform");

  if (!contentId || !platform) {
    return json(
      { error: "content_id and platform are required" },
      400
    );
  }

  const db = getDB(env);

  /* ===============================
     Load content context
  =============================== */
  const content = await db
    .prepare(`SELECT * FROM content_context WHERE id = ?`)
    .bind(contentId)
    .first();

  if (!content) {
    return json({ error: "Content not found" }, 404);
  }

  /* ===============================
     Load brand
  =============================== */
  const brand = await db
    .prepare(`SELECT * FROM brands WHERE id = ?`)
    .bind(auth.brand_id)
    .first();

  /* ===============================
     Load media pool
  =============================== */
  const mediaPoolResult = await db
    .prepare(
      `SELECT * FROM media_assets
       WHERE brand_id = ?
       ORDER BY created_at DESC`
    )
    .bind(auth.brand_id)
    .all();

  const mediaPool = mediaPoolResult?.results || [];

  /* ===============================
     Generate suggestions
  =============================== */
  const suggestions = suggestMedia({
    mediaPool,
    content,
    brand,
    platform
  });

  return json({ suggestions });
}
