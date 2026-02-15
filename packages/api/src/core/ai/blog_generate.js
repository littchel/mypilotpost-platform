import { json } from "../../lib/json.js";
import { logEvent } from "../../lib/events.js";
import { createBlogPost, updateBlogPost } from "../content/blog.js";

/* 🔒 AI HARDENING */
import { postProcessBlog } from "./postprocess.js";

/* 📊 AI QUALITY */
import { scoreBlogArticle } from "./quality.js";

/* ======================================================
   AI — BLOG ARTICLE GENERATION (HARDENED v1)
====================================================== */

export async function generateBlogArticle(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    context_id,
    draft_id,
    goal,
    audience,
    primary_keyword,
    secondary_keywords = [],
    localization = "google.com",
    length = "Medium",
    include_statistics = false,
    include_examples = false
  } = body || {};

  /* ---------------- VALIDATION ---------------- */

  if (!context_id) {
    return json({ error: "context_id is required" }, 400);
  }

  if (!goal || !audience || !primary_keyword) {
    return json(
      { error: "goal, audience, and primary_keyword are required" },
      400
    );
  }

  /* ---------------- ENSURE DRAFT ---------------- */

  let contentId = draft_id;
  let createdDraft = false;

  if (!contentId) {
    const draftResponse = await createBlogPost(
      new Request("http://internal/create", {
        method: "POST",
        body: JSON.stringify({
          context_id,
          title: `${goal} — ${primary_keyword}`
        })
      }),
      env,
      auth
    );

    const draftJson = await draftResponse.json();
    contentId = draftJson?.draft_id;
    createdDraft = true;

    if (!contentId) {
      return json({ error: "Failed to create blog draft" }, 500);
    }
  }

  /* ---------------- AI GENERATION ---------------- */

  const article = await generateArticleWithAI({
    goal,
    audience,
    primary_keyword,
    secondary_keywords,
    localization,
    length,
    include_statistics,
    include_examples
  });

  /* 🔒 POST-PROCESS (ENFORCEMENT) ---------------- */

  const hardened = postProcessBlog({
    title: article.title,
    body: article.body,
    primary_keyword
  });

  /* 📊 QUALITY SCORE ---------------- */

  const quality = scoreBlogArticle({
    title: hardened.title,
    body: hardened.body,
    primary_keyword
  });

  /* ---------------- PERSIST ARTICLE ---------------- */

  await updateBlogPost(
    new Request("http://internal/update", {
      method: "PATCH",
      body: JSON.stringify({
        title: hardened.title,
        body: hardened.body
      })
    }),
    env,
    contentId,
    auth
  );

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
        secondary_keywords,
        localization,
        length,
        include_statistics,
        include_examples,
        created_new_draft: createdDraft,
        quality_score: quality.score,
        quality_grade: quality.grade
      }
    });
  } catch (err) {
    console.error("[ai:blog:event]", err?.message || err);
  }

  /* ---------------- RESPONSE ---------------- */

  return json({
    content_id: contentId,
    title: hardened.title,
    body: hardened.body,
    quality
  });
}

/* ======================================================
   MOCK AI GENERATOR (REPLACE LATER)
====================================================== */

async function generateArticleWithAI({
  goal,
  audience,
  primary_keyword,
  secondary_keywords,
  localization,
  length,
  include_statistics,
  include_examples
}) {
  const wordCount =
    length === "Short" ? "400–500" :
    length === "Medium" ? "900–1200" :
    length === "Long" ? "1600–2000" :
    "2500+";

  let body = `
## ${goal} for ${audience}

This article focuses on **${primary_keyword}** and is optimized for **${localization}**.

### Key Topics
- ${primary_keyword}
${secondary_keywords.map(k => `- ${k}`).join("\n")}

### Insights
This ${length.toLowerCase()} article (${wordCount} words) is designed to help ${audience.toLowerCase()} achieve ${goal.toLowerCase()}.
`;

  if (include_statistics) {
    body += `
### Statistics
Recent studies show measurable improvements when applying best practices related to ${primary_keyword}.
`;
  }

  if (include_examples) {
    body += `
### Real-World Examples
Businesses across multiple industries have successfully applied these strategies with tangible results.
`;
  }

  body += `
### Conclusion
By focusing on ${primary_keyword}, organizations can unlock sustainable growth aligned with ${goal.toLowerCase()}.
`;

  return {
    title: `${primary_keyword}: A ${goal} Guide`,
    body: body.trim()
  };
}
