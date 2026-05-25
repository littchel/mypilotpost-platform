// packages/api/src/core/ai/hashtags.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logEvent } from "../../lib/events.js";
import { runLLM } from "./ai_client.js";

const FALLBACK_HASHTAGS = {
  trending: ["#marketing", "#socialmedia", "#business", "#growth"],
  niche: ["#brandstrategy", "#contentmarketing", "#digitalmarketing"]
};

export async function generateHashtags(request, env, auth) {
  if (!auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", "INVALID_JSON", null, 400);
  }

  const { text, platform } = body || {};

  if (!text || !platform) {
    return error("text and platform are required", "BAD_REQUEST", null, 400);
  }

  const prompt = `Generate relevant hashtags for a ${platform} post.
Post content: "${text.slice(0, 400)}"

Respond in strict JSON:
{
  "trending": ["#tag1", "#tag2", "#tag3", "#tag4"],
  "niche": ["#tag5", "#tag6", "#tag7"]
}
Use only real, commonly-used hashtags. No invented or random tags.`;

  const db = getDB(env);
  const brand = await db.prepare("SELECT * FROM brands WHERE id = ?").bind(auth.brand_id).first();

  const { output } = await runLLM(env, prompt, { brand });

  let groups = FALLBACK_HASHTAGS;
  try {
    const parsed = JSON.parse(output);
    if (parsed?.trending?.length > 0 || parsed?.niche?.length > 0) {
      groups = {
        trending: parsed.trending || FALLBACK_HASHTAGS.trending,
        niche: parsed.niche || FALLBACK_HASHTAGS.niche,
      };
    }
  } catch {
    // fall through to FALLBACK_HASHTAGS
  }

  try {
    await logEvent(env, {
      event_type: "hashtags_generated",
      brand_id: auth.brand_id,
      user_id: auth.user_id || null,
      metadata: { platform, count: groups.trending.length + groups.niche.length }
    });
  } catch (err) {
    console.error("[hashtags:event]", err);
  }

  return json({ groups });
}
