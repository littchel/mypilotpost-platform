// packages/api/src/core/ai/blog_generate.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logEvent } from "../../lib/events.js";
import { createBlogPost, updateBlogPost } from "../content/blog.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import { trackedRunLLM } from "./ai_client.js";
import { scoreBlogArticle } from "./quality.js";
import { postProcessBlog } from "./postprocess.js";

export async function generateBlogArticle(request, env, auth) {
  if (!auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  const db = getDB(env);

  await checkAndIncrement(db, auth.user_id, "ai");

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", "INVALID_JSON", null, 400);
  }

  const { context_id, draft_id, goal, audience, primary_keyword } = body || {};

  if (!goal || !audience || !primary_keyword) {
    return error(
      "goal, audience, and primary_keyword are required",
      "BAD_REQUEST",
      null,
      400
    );
  }

  /* ---------------- ENSURE DRAFT ---------------- */
  let contentId = draft_id;
  let contextId = context_id;

  if (!contentId) {
    const draftResponse = await createBlogPost(
      new Request("http://internal/create", {
        method: "POST",
        body: JSON.stringify({ title: `${goal} — ${primary_keyword}` })
      }),
      env,
      auth
    );
    const draftJson = await draftResponse.json();
    contentId = draftJson?.draft_id;
    contextId = draftJson?.context_id;
    if (!contentId) return error("Failed to create blog draft", "SERVER_ERROR", null, 500);
  }

  /* ---------------- BRAND DNA FETCH ---------------- */
  const [brand, dnaProfile, dnaVoice, dnaAudience, dnaPillars] = await Promise.all([
    db.prepare("SELECT id, name, industry FROM brands WHERE id = ?").bind(auth.brand_id).first(),
    db.prepare("SELECT mission, positioning, value_proposition, brand_personality FROM brand_dna_profiles WHERE brand_id = ?").bind(auth.brand_id).first(),
    db.prepare("SELECT voice_traits, forbidden_language, messaging_style FROM brand_dna_voice WHERE brand_id = ?").bind(auth.brand_id).first(),
    db.prepare("SELECT icp_name, pain_points FROM brand_dna_audience WHERE brand_id = ?").bind(auth.brand_id).first(),
    db.prepare("SELECT title FROM brand_dna_content_pillars WHERE brand_id = ? LIMIT 5").bind(auth.brand_id).all(),
  ]);

  function parseJsonSafe(val, fallback) {
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return fallback; }
  }

  // Build brand context string — gracefully empty if DNA not yet configured
  const brandParts = [];
  if (brand?.name)                   brandParts.push(`Brand: ${brand.name}`);
  if (brand?.industry)               brandParts.push(`Industry: ${brand.industry}`);
  if (dnaProfile?.positioning)       brandParts.push(`Positioning: ${dnaProfile.positioning}`);
  if (dnaProfile?.value_proposition) brandParts.push(`Value Proposition: ${dnaProfile.value_proposition}`);
  if (dnaProfile?.mission)           brandParts.push(`Mission: ${dnaProfile.mission}`);
  if (dnaVoice?.voice_traits) {
    const traits = parseJsonSafe(dnaVoice.voice_traits, []);
    if (traits.length) brandParts.push(`Voice Traits: ${traits.join(", ")}`);
  }
  if (dnaVoice?.messaging_style)     brandParts.push(`Messaging Style: ${dnaVoice.messaging_style}`);
  if (dnaAudience?.icp_name)         brandParts.push(`Target Reader: ${dnaAudience.icp_name}`);
  const pillarTitles = (dnaPillars?.results || []).map(p => p.title).filter(Boolean);
  if (pillarTitles.length)           brandParts.push(`Content Pillars: ${pillarTitles.join(", ")}`);

  const brandContext = brandParts.join("\n");

  const forbiddenPhrases = parseJsonSafe(dnaVoice?.forbidden_language, []);
  const forbiddenLine = forbiddenPhrases.length
    ? `\nFORBIDDEN PHRASES (never use): ${forbiddenPhrases.slice(0, 10).map(f => `"${f}"`).join(", ")}`
    : "";

  /* ---------------- AI GENERATION ---------------- */
  const prompt = `Write a structured, brand-aligned blog article.
${brandContext ? `\nBRAND CONTEXT:\n${brandContext}\n` : ""}
Goal: ${goal}
Target audience: ${audience}
Primary keyword: "${primary_keyword}"

REQUIREMENTS:
- Write in the brand's voice and style as defined above — not generic
- Title must contain the primary keyword and be under 70 chars
- Body must be at least 600 words with ## subheadings
- Every section should be useful to "${audience}" — not generic advice
- Do not use the primary keyword more than once per 100 words${forbiddenLine}

Respond in strict JSON:
{
  "title": "SEO-optimised title (max 70 chars, include primary keyword)",
  "summary": "Meta description (max 160 chars)",
  "body": "Full markdown article with ## subheadings, min 600 words",
  "seoMeta": {
    "title": "SEO title",
    "description": "Meta description"
  }
}`;

  const result = await trackedRunLLM(env, {
    brand,
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id,
    content_type: "blog",
    options: { systemPromptType: 'blog' },
  });

  const rawTitle   = result?.title    || `${primary_keyword}: A Guide to ${goal}`;
  const rawSummary = result?.summary  || "";
  const rawBody    = result?.body     || "";
  const seoMeta    = result?.seoMeta  || { title: rawTitle, description: rawSummary };

  // Quality score before post-processing
  const rawQuality = scoreBlogArticle({ title: rawTitle, body: rawBody, primary_keyword });

  // Apply post-processing: title length guard, H2 safety, keyword density cap
  const { title, body: bodyText } = postProcessBlog({
    title: rawTitle,
    body: rawBody,
    primary_keyword,
  });
  const summary = rawSummary;

  // Quality score after post-processing
  const quality = scoreBlogArticle({ title, body: bodyText, primary_keyword });

  /* ---------------- PERSIST ---------------- */
  if (bodyText) {
    await updateBlogPost(
      new Request("http://internal/update", {
        method: "PATCH",
        body: JSON.stringify({ title, body: bodyText })
      }),
      env,
      contentId,
      auth
    );
  }

  /* ---------------- EVENT ---------------- */
  try {
    await logEvent(env, {
      event_type: "ai_generated_blog",
      brand_id: auth.brand_id,
      user_id: auth.user_id || null,
      content_id: contentId,
      metadata: { goal, audience, primary_keyword, success: !!result, quality_score: quality.score }
    });
  } catch (err) {
    console.error("[ai:blog:event]", err?.message || err);
  }

  return json({
    title, summary, body: bodyText, seoMeta,
    quality_score_raw: rawQuality.score,
    quality_score: quality.score,
    quality_grade: quality.grade,
    quality_breakdown: quality.breakdown,
  });
}
