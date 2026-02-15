// packages/api/src/core/ai/social_generate.js
// myPilotPost — AI Social Generation (HARDENED v1)

import { json } from "../../lib/json.js";
import { logEvent } from "../../lib/events.js";
import { createSocialAsset } from "../content/social.js";
import { saveSocialVariants } from "../content/social_variants.js";

/* 🔒 ENFORCEMENT */
import { postProcessSocial } from "./postprocess.js";
import { scoreSocialPost } from "./quality.js";

/* ======================================================
   CONSTANTS
====================================================== */

const ALLOWED_PLATFORMS = [
  "Facebook",
  "Instagram",
  "X",
  "LinkedIn",
  "YouTube",
  "TikTok",
  "Pinterest",
  "Threads"
];

/* ======================================================
   POST /api/customer/ai/social/generate
====================================================== */

export async function generateSocialContent(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    context_id,
    draft_id,
    intention,
    platforms,
    tone,
    cta,
    include_emojis = false
  } = payload || {};

  if (!context_id || !intention || !tone || !cta) {
    return json({ error: "Missing required fields" }, 400);
  }

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return json({ error: "platforms must be a non-empty array" }, 400);
  }

  for (const p of platforms) {
    if (!ALLOWED_PLATFORMS.includes(p)) {
      return json({ error: `Unsupported platform: ${p}` }, 400);
    }
  }

  /* ---------------- ENSURE DRAFT ---------------- */

  let contentId = draft_id;
  let createdDraft = false;

  if (!contentId) {
    const draftRes = await createSocialAsset(
      new Request("http://internal/create", {
        method: "POST",
        body: JSON.stringify({
          context_id,
          title: `${intention} — Social`
        })
      }),
      env,
      auth
    );

    const draftJson = await draftRes.json();
    contentId = draftJson?.draft_id;
    createdDraft = true;

    if (!contentId) {
      return json({ error: "Failed to create draft" }, 500);
    }
  }

  /* ---------------- BASE COPY ---------------- */

  const baseCopy = generateBaseCopy({
    intention,
    tone,
    cta,
    include_emojis
  });

  /* ---------------- PLATFORM HARDENING ---------------- */

  const variants = {};
  const quality = {};

  for (const platform of platforms) {
    const hardened = postProcessSocial({
      platform,
      content: baseCopy,
      hashtags: [],
      allow_emojis: include_emojis
    });

    if (!hardened?.content || hardened.content.trim().length === 0) {
      return json(
        { error: `Failed to generate content for ${platform}` },
        500
      );
    }

    const hashtags = hardened.hashtags || [];
    const ctaPresent =
      typeof cta === "string" &&
      hardened.content.toLowerCase().includes(cta.toLowerCase());

    variants[platform] = hardened.content;

    quality[platform] = scoreSocialPost({
      platform,
      content: hardened.content,
      hashtags,
      cta_present: ctaPresent
    });
  }

  /* ---------------- SAVE VARIANTS ---------------- */

  await saveSocialVariants(
    new Request("http://internal/variants", {
      method: "PUT",
      body: JSON.stringify({ variants })
    }),
    env,
    contentId,
    auth
  );

  /* ---------------- EVENT ---------------- */

  try {
    await logEvent(env, {
      event_type: "ai_generated_social",
      brand_id: auth.brand_id,
      user_id: auth.user_id || null,
      content_id: contentId,
      metadata: {
        intention,
        tone,
        cta,
        platforms,
        include_emojis,
        created_new_draft: createdDraft
      }
    });
  } catch (err) {
    console.error("[ai:social:event]", err);
  }

  /* ---------------- RESPONSE ---------------- */

  return json({
    content_id: contentId,
    variants,
    quality
  });
}

/* ======================================================
   BASE COPY GENERATOR (INTENTION-DRIVEN)
====================================================== */

function generateBaseCopy({ intention, tone, cta, include_emojis }) {
  const emoji = include_emojis ? " ✨" : "";
  return `${intention}. ${cta}.${emoji}`.trim();
}
