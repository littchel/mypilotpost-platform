// packages/api/src/core/ai/hashtags.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logEvent } from "../../lib/events.js";
import { trackedRunLLM } from "./ai_client.js";
import { checkAndIncrement } from "../billing/enforcement.js";

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
  await checkAndIncrement(db, auth.user_id, "ai");
  const brand = await db.prepare("SELECT id, name, industry FROM brands WHERE id = ?").bind(auth.brand_id).first();

  const result = await trackedRunLLM(env, {
    brand,
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "hashtags",
    platform,
    options: { systemPromptType: 'hashtags' },
  });

  let groups = FALLBACK_HASHTAGS;
  if (result?.trending?.length > 0 || result?.niche?.length > 0) {
    groups = {
      trending: result.trending || FALLBACK_HASHTAGS.trending,
      niche: result.niche || FALLBACK_HASHTAGS.niche,
    };
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
