import { json, error } from "../../../lib/json.js";
import { searchFreepik } from "./freepik.js";
import { adaptFreepikResults } from "./adapters/freepik_adapter.js";

export async function getMediaSuggestions(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const { query } = await req.json().catch(() => ({}));
  if (!query) return error("query required", 400);

  const freepikRaw = await searchFreepik({ query }, env);
  const suggestions = adaptFreepikResults(freepikRaw);

  return json({
    provider: "freepik",
    items: suggestions
  });
}
