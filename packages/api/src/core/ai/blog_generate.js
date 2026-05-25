// packages/api/src/core/ai/blog_generate.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logEvent } from "../../lib/events.js";
import { createBlogPost, updateBlogPost } from "../content/blog.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import { trackedRunLLM } from "./ai_client.js";

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

  /* ---------------- AI GENERATION ---------------- */
  const brand = await db.prepare("SELECT * FROM brands WHERE id = ?").bind(auth.brand_id).first();

  const prompt = `You are an expert content strategist. Write a structured blog article.
Goal: ${goal}
Target audience: ${audience}
Primary keyword: "${primary_keyword}"

Respond in strict JSON:
{
  "title": "SEO-optimised title (max 70 chars)",
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
  });

  const title    = result?.title    || `${primary_keyword}: A Guide to ${goal}`;
  const summary  = result?.summary  || "";
  const bodyText = result?.body     || "";
  const seoMeta  = result?.seoMeta  || { title, description: summary };

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
      metadata: { goal, audience, primary_keyword, success: !!result }
    });
  } catch (err) {
    console.error("[ai:blog:event]", err?.message || err);
  }

  return json({ title, summary, body: bodyText, seoMeta });
}
