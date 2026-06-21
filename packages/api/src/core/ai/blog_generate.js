// packages/api/src/core/ai/blog_generate.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logEvent } from "../../lib/events.js";
import { createBlogPost, updateBlogPost } from "../content/blog.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import { trackedRunLLM } from "./ai_client.js";
import { scoreBlogArticle } from "./quality.js";
import { postProcessBlog } from "./postprocess.js";
import { fetchBrandContext, contextHash } from "./brand_context.js";

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

  const { context_id, draft_id, goal, audience, primary_keyword, secondary_keywords, domain } = body || {};

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
        body: JSON.stringify({
          title: `${goal} — ${primary_keyword}`,
          body: "Initial placeholder content for the blog post draft before AI generation completes.",
          slug: null,
          campaign_id: null
        })
      }),
      env,
      auth
    );
    const draftJson = await draftResponse.json();
    contentId = draftJson?.content_id || draftJson?.draft_id;
    contextId = draftJson?.context_id;
    if (!contentId) return error("Failed to create blog draft", "SERVER_ERROR", null, 500);
  }

  /* ---------------- BRAND CONTEXT (unified) ---------------- */
  const dnaCtx = await fetchBrandContext(db, auth.brand_id, 'full');
  const brand = dnaCtx.brand;
  const brandContext = dnaCtx.context;
  const forbiddenLine = dnaCtx.forbidden.length
    ? `\nFORBIDDEN PHRASES (never use): ${dnaCtx.forbidden.slice(0, 10).map(f => `"${f}"`).join(", ")}`
    : "";

  // Phase 6 — context hash
  const ctxHash = await contextHash(auth.brand_id, 'blog', `${primary_keyword}|${goal}|${secondary_keywords || ""}|${domain || ""}`);

  /* ---------------- AI GENERATION ---------------- */
  const prompt = `Write a structured, brand-aligned blog article.
${brandContext ? `\nBRAND CONTEXT:\n${brandContext}\n` : ""}
Goal: ${goal}
Target audience: ${audience}
Primary keyword: "${primary_keyword}"
${secondary_keywords ? `Secondary keywords to include: ${secondary_keywords}\n` : ""}${domain ? `Target localization/Google domain: ${domain}\n` : ""}

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

  const llmParams = {
    brand,
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id,
    content_type: "blog",
    options: { systemPromptType: 'blog' },
    context_hash: ctxHash,
  };

  const result = await trackedRunLLM(env, llmParams);

  const rawTitle   = result?.title    || `${primary_keyword}: A Guide to ${goal}`;
  const rawSummary = result?.summary  || "";
  const rawBody    = result?.body     || "";
  const seoMeta    = result?.seoMeta  || { title: rawTitle, description: rawSummary };

  // Quality score before post-processing
  const rawQuality = scoreBlogArticle({ title: rawTitle, body: rawBody, primary_keyword });

  // Apply post-processing: title length guard, H2 safety, keyword density cap
  let { title, body: bodyText } = postProcessBlog({ title: rawTitle, body: rawBody, primary_keyword });
  let summary = rawSummary;

  // Quality score after post-processing
  let quality = scoreBlogArticle({ title, body: bodyText, primary_keyword });

  // Phase 1 — Quality Loop: retry once if score < 70, keep higher score
  if (quality.score < 70) {
    await checkAndIncrement(db, auth.user_id, "ai");
    const retryResult = await trackedRunLLM(env, llmParams);

    if (retryResult?.body) {
      const { title: rt, body: rb } = postProcessBlog({
        title: retryResult.title || rawTitle,
        body: retryResult.body,
        primary_keyword,
      });
      const retryQuality = scoreBlogArticle({ title: rt, body: rb, primary_keyword });
      if (retryQuality.score > quality.score) {
        title = rt;
        bodyText = rb;
        summary = retryResult.summary || summary;
        quality = retryQuality;
      }
    }
  }

  /* ---------------- PERSIST ---------------- */
  if (bodyText) {
    await updateBlogPost(
      new Request(`http://internal/update/${contentId}`, {
        method: "PATCH",
        body: JSON.stringify({ title, body: bodyText })
      }),
      env,
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
    quality_loop_active: true,
  });
}
