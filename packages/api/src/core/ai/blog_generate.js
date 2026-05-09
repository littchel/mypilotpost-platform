// packages/api/src/core/ai/blog_generate.js
// myPilotPost — AI Blog Generation (v1.1.1 Stabilization)

import { json, error } from "../../lib/json.js";
import { logEvent } from "../../lib/events.js";
import { createBlogPost, updateBlogPost } from "../content/blog.js";

const USE_FAKE_AI = true;

/* ======================================================
   AI — BLOG ARTICLE GENERATION (HARDENED v1)
====================================================== */

export async function generateBlogArticle(request, env, auth) {
  if (!auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", "INVALID_JSON", null, 400);
  }

  const {
    context_id,
    draft_id,
    goal,
    audience,
    primary_keyword
  } = body || {};

  if (!goal || !audience || !primary_keyword) {
    return error(
      "goal, audience, and primary_keyword are required",
      "BAD_REQUEST",
      null,
      400
    );
  }

  /* ---------------- ENSURE DRAFT/CONTEXT ---------------- */

  let contentId = draft_id;
  let contextId = context_id;

  if (!contentId) {
    const draftResponse = await createBlogPost(
      new Request("http://internal/create", {
        method: "POST",
        body: JSON.stringify({
          title: `${goal} — ${primary_keyword}`
        })
      }),
      env,
      auth
    );

    const draftJson = await draftResponse.json();
    contentId = draftJson?.draft_id;
    contextId = draftJson?.context_id;

    if (!contentId) {
      return error("Failed to create blog draft", "SERVER_ERROR", null, 500);
    }
  }

  /* ---------------- AI GENERATION (FAKE MODE) ---------------- */

  const title = `${primary_keyword}: A Strategic Guide to ${goal}`;
  const bodyContent = `
## Introduction to ${primary_keyword}

In today's aviation market, ${primary_keyword} has become a critical component for ${audience}. This guide explores how to achieve ${goal} through strategic implementation and industry best practices.

### Key Pillars of Success
1. **Understanding the Landscape**: The aviation sector is evolving rapidly across Africa and beyond.
2. **Innovation & Technology**: Leveraging modern tools is no longer optional.
3. **Strategic Execution**: Aligning your goals with operational excellence.

### Conclusion
By focusing on ${primary_keyword}, organizations can unlock sustainable growth.
`.trim();

  /* ---------------- PERSIST ARTICLE ---------------- */

  if (USE_FAKE_AI) {
    await updateBlogPost(
      new Request("http://internal/update", {
        method: "PATCH",
        body: JSON.stringify({
          title,
          body: bodyContent
        })
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
      metadata: {
        goal,
        audience,
        primary_keyword,
        is_fake: USE_FAKE_AI
      }
    });
  } catch (err) {
    console.error("[ai:blog:event]", err?.message || err);
  }

  /* ---------------- RESPONSE (LOCKED v1.1.1) ---------------- */
  return json({
    title: "The Future of Aviation in Africa",
    summary: "Africa’s aviation industry is rapidly evolving...",
    body: "Full article body here...",
    seoMeta: {
      title: "Aviation Growth in Africa",
      description: "Explore the future of aviation in Africa..."
    }
  });
}

