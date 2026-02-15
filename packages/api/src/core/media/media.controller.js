import { json } from "../../../lib/json.js";
import { getMediaPool } from "../../media/media_pool.js";
import { suggestMedia } from "./media_suggest.js";

export async function suggestMediaHandler(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const {
    platform,
    content,
    limit,
    sources = ["internal"]
  } = body || {};

  if (!platform || !content) {
    return json({ error: "platform and content are required" }, 400);
  }

  const mediaPool = await getMediaPool(env, {
    brand_id: auth.brand_id,
    sources,
    limit: 50
  });

  const suggestions = suggestMedia({
    mediaPool,
    content,
    platform
  });

  return json({
    platform,
    suggestions: limit ? suggestions.slice(0, limit) : suggestions
  });
}
