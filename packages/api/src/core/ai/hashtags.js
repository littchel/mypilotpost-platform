// packages/api/src/core/ai/hashtags.js
// myPilotPost — AI Hashtag Generation (v1.1.1 Stabilization)

import { json, error } from "../../lib/json.js";
import { logEvent } from "../../lib/events.js";

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
    return error(
      "text and platform are required",
      "BAD_REQUEST",
      null,
      400
    );
  }

  // Deterministic Response
  const trending = ["#aviation", "#africa", "#growth", "#innovation"];
  const niche = ["#airtransport", "#avgeek", "#pilotlife"];

  try {
    await logEvent(env, {
      event_type: "hashtags_generated",
      brand_id: auth.brand_id,
      user_id: auth.user_id || null,
      metadata: { platform, count: trending.length + niche.length }
    });
  } catch (err) {
    console.error("[hashtags:event]", err);
  }

  return json({
    groups: {
      trending,
      niche
    }
  });
}

