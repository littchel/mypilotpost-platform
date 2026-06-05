/**
 * myPilotPost — Media Suggestions Controller v2
 * Routes POST /api/customer/media/suggestions to the media engine.
 * Accepts body: { platform, contentType, format, text, title, brand, industry, goal }
 */

import { json } from "../../../lib/json.js";
import { runMediaEngine } from "../media_engine.js";

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
  } = body;

  try {
    const result = await runMediaEngine(
      { platform, contentType, format, text, title, brand, industry, goal },
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
