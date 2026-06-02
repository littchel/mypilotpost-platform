import { json, error } from "../../../lib/json.js";
import { searchPexels } from "./pexels.js";
import { adaptPexelsResults } from "./adapters/pexels_adapter.js";

export async function getMediaSuggestions(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const { query } = await req.json().catch(() => ({}));
  if (!query) return error("query required", 400);

  try {
    const raw = await searchPexels({ query }, env);
    const items = adaptPexelsResults(raw);
    return json({ provider: "pexels", items });
  } catch {
    return json({ provider: "pexels", items: [], error: "media_service_unavailable" }, 200);
  }
}
