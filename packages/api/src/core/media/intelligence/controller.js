/**
 * myPilotPost — Media Suggestions Controller v3
 * Routes POST /api/customer/media/suggestions to the media engine.
 * Accepts body: { platform, contentType, format, text, title, brand, industry, goal }
 * Fetches Brand DNA from DB (Step 5) and passes it as brandDna to the engine.
 */

import { json }           from "../../../lib/json.js";
import { getDB }          from "../../../lib/db.js";
import { runMediaEngine } from "../media_engine.js";

async function fetchBrandDna(env, brandId) {
  try {
    return await getDB(env)
      .prepare(
        `SELECT bdp.industry, bdp.positioning, bdv.imagery_style, bdv.visual_direction
         FROM brand_dna_profiles bdp
         LEFT JOIN brand_dna_visual_identity bdv ON bdv.brand_id = bdp.brand_id
         WHERE bdp.brand_id = ?
         LIMIT 1`
      )
      .bind(brandId)
      .first();
  } catch {
    return null;
  }
}

export async function getMediaSuggestions(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body = {};
  try { body = await request.json(); } catch { /* empty body is fine */ }

  const {
    platform    = 'instagram',
    contentType = 'social',
    format,
    text        = '',
    title       = '',
    brand       = '',
    industry    = '',
    goal        = '',
    batch       = null,
  } = body;

  // Fetch Brand DNA — null-safe, never throws (Step 5)
  const brandDna = await fetchBrandDna(env, auth.brand_id);

  try {
    const result = await runMediaEngine(
      { platform, contentType, format, text, title, brand, industry, goal, brandDna, batch },
      env
    );
    return json(result);
  } catch (err) {
    console.error('[MEDIA ENGINE ERROR]', err?.message);
    return json({
      featured: [], recommended: [], more: [],
      byCategory: { human: [], professional: [], minimal: [], general: [] },
      meta: { query: '', confidence: 0, error: true },
    });
  }
}
