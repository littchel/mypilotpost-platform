// packages/api/src/core/ai/social_generate.js
// myPilotPost — AI Social Generation (v1.1.1 Stabilization)

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logEvent } from "../../lib/events.js";
import { createSocialAsset } from "../content/social.js";
import { saveSocialVariants } from "../content/social_variants.js";
import { checkAndIncrement } from "../billing/enforcement.js";

import { runLLM } from "./ai_client.js";

const ALLOWED_PLATFORMS = [
  "facebook",
  "instagram",
  "x",
  "linkedin",
  "youtube",
  "tiktok",
  "pinterest",
  "threads"
];

/* ======================================================
   POST /api/customer/ai/social/generate
====================================================== */

export async function generateSocialContent(request, env, auth) {
  if (!auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  const db = getDB(env);
  
  // Enforcement Check
  await checkAndIncrement(db, auth.user_id, "ai");

  let payload;
  try {
    payload = await request.json();
  } catch {
    return error("Invalid JSON body", "INVALID_JSON", null, 400);
  }

  const {
    context_id,
    draft_id,
    intention,
    issue_context, // NEW: Context from audit
    platforms = ["linkedin"],
    tone = "professional",
    cta = "Learn More",
    count = 3 // NEW: Number of posts to generate
  } = payload || {};

  if (!intention && !issue_context) {
    return error("intention or issue_context is required", "BAD_REQUEST", null, 400);
  }

  /* ---------------- AI GENERATION (HARDENED) ---------------- */
  const brand = await db.prepare("SELECT * FROM brands WHERE id = ?").bind(auth.brand_id).first();
  
  const systemPrompt = `You are a professional social media manager. 
Generate ${count} post variants for ${platforms.join(", ")}.
Tone: ${tone}. CTA: ${cta}.
Context: ${intention || issue_context}.
Respond in strict JSON format: { "posts": [{ "content": string, "platform": string, "tone": string, "cta": string, "hashtags": string[] }] }`;

  const { output } = await runLLM(env, systemPrompt, { brand });
  
  let generatedPosts = [];
  try {
    const data = JSON.parse(output);
    generatedPosts = data.posts || [];
  } catch (e) {
    console.error("AI Generation failed or returned malformed JSON:", output);
    return json({ error: "AI service unavailable" }, 503);
  }

  if (generatedPosts.length === 0) {
    return json({ error: "AI service unavailable" }, 503);
  }

  /* ---------------- RESPONSE ---------------- */
  return json({
    draft_id: draft_id || crypto.randomUUID(),
    posts: generatedPosts,
    recommended_plan: "growth" // For enforcement context if needed
  });
}

