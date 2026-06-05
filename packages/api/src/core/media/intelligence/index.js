import { json, error } from "../../../lib/json.js";
import { searchPexels } from "./pexels.js";
import { adaptPexelsResults } from "./adapters/pexels_adapter.js";
import { runMediaEngine } from "../media_engine.js";
import { emit, TOOLS, EVENTS } from "../../events/emit.js";

export async function getMediaSuggestions(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const { query, platform, contentType, text, brand, industry } = body;

  // Enhanced path — full context payload
  if (platform || text || contentType) {
    try {
      const result = await runMediaEngine({ platform, contentType, text, brand, industry }, env);
      // Memory: record media suggestions were used
      emit(env, { tool: TOOLS.MEDIA, event: EVENTS.MEDIA_SELECTED, brandId: auth.brand_id, userId: auth.user_id, metadata: { platform, provider: 'pexels' } });
      return json({ provider: "pexels", ...result });
    } catch {
      return json({ provider: "pexels", featured: [], recommended: [], more: [], byCategory: {} }, 200);
    }
  }

  // Legacy path — backward compat with { query }
  if (!query) return error("query required", 400);
  try {
    const raw = await searchPexels({ query }, env);
    const items = adaptPexelsResults(raw);
    return json({ provider: "pexels", items });
  } catch {
    return json({ provider: "pexels", items: [], error: "media_service_unavailable" }, 200);
  }
}
