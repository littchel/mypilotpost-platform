import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

export async function recordMediaSuggestionFeedback(
  request,
  env,
  auth
) {
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
    content_id,
    media_id,
    platform,
    source,
    action
  } = body || {};

  if (!media_id || !platform || !source || !action) {
    return json({ error: "Missing required fields" }, 400);
  }

  const allowed = ["accepted", "rejected", "ignored", "removed"];
  if (!allowed.includes(action)) {
    return json({ error: "Invalid action" }, 400);
  }

  const db = getDB(env);

  await db.prepare(`
    INSERT INTO media_suggestion_feedback
    (brand_id, user_id, content_id, media_id, platform, source, action)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    auth.brand_id,
    auth.user_id || null,
    content_id || null,
    media_id,
    platform,
    source,
    action
  ).run();

  return json({ status: "ok" });
}
