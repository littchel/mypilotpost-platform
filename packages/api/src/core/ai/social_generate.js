// packages/api/src/core/ai/social_generate.js
// myPilotPost — AI Social Generation v3.0

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import { trackedRunLLM } from "./ai_client.js";
import { scoreSocialPost } from "./quality.js";
import { postProcessSocial } from "./postprocess.js";
import { fetchBrandContext, loadRecentHooks, contextHash } from "./brand_context.js";

const ALLOWED_PLATFORMS = [
  "facebook", "instagram", "x", "linkedin",
  "youtube", "tiktok", "pinterest", "threads"
];

const TONE_INSTRUCTIONS = {
  professional:  "Authoritative but approachable. Clear, direct sentences. No fluff. Leads with insight, closes with confidence.",
  founder:       "First-person, honest, slightly vulnerable. Shares real decisions and behind-the-scenes perspective. Not a press release — a real person talking.",
  educational:   "Step-by-step, numbered lists or arrows. Teaches one specific thing clearly. Never condescending. Positions the brand as the expert guide.",
  premium:       "Calm, elevated, exclusivity implied. Short sentences. Confident understatement. No exclamation marks. Lets quality speak.",
  community:     "Inclusive, warm, conversational. 'We' and 'you' language. Invites participation. Celebrates the audience, not the brand.",
  performance:   "Direct, urgent, numbers-driven. Specific results, not generalities. Proof-first, then claim. Optimised for clicks and conversions.",
};

function buildPrompt({ brandContext, forbidden, intention, tone, ctaLabel, platforms, count, recentHooks = [] }) {
  const platformList = platforms.join(", ");
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const forbiddenList = forbidden.slice(0, 15).map(f => `"${f}"`).join(", ");
  const memoryBlock = recentHooks.length
    ? `\nAVOID REPEATING THESE RECENTLY USED HOOKS (use a completely different angle):\n${recentHooks.map(h => `- "${h}"`).join("\n")}\n`
    : "";

  return `You are an expert social media copywriter for a specific brand. Generate ${count} high-quality social media post variant(s) for: ${platformList}.

BRAND CONTEXT:
${brandContext}

CONTENT BRIEF:
- Primary Goal: ${intention}
- Tone/Voice: ${tone} — ${toneInstruction}
- Call to Action type: ${ctaLabel}
- Target Platforms: ${platformList}
${memoryBlock}
CONTENT STRUCTURE (use all 4 elements in order):
1. HOOK — First 1-2 lines. Must stop the scroll. Specific, concrete, provocative or surprising. Never generic.
2. VALUE — The substance. Teach, reveal, or prove something real. Use specifics: numbers, steps, insights, outcomes.
3. SOCIAL PROOF — One supporting point: customer result, data point, case study, or specific credential. Keep it brief.
4. CTA — Tailored to "${ctaLabel}". Direct and specific. Match the tone.
5. HASHTAGS — 5-8 relevant, mix of broad and niche. No generic #success #motivation #entrepreneur spam.

BANNED PHRASES (never use any of these):
${forbiddenList}

PLATFORM VARIANTS REQUIRED:
- linkedin: Professional format, longer allowed, no excessive emojis
- instagram: Punchy, emojis OK, break into short lines
- facebook: Conversational, slightly longer OK, direct CTA
- x: Under 250 chars, punchy, one idea only
- Include variants for all requested platforms that have specific formatting needs

CRITICAL RULES:
- Every post must feel like it was written FOR this specific brand, not a generic template
- No startup clichés, no empty buzzwords
- If the brand has voice traits or messaging style defined above, they MUST come through
- The hook must be SPECIFIC and earn attention — not a generic question or obvious statement
- Social proof must be real-sounding and specific, not vague

Respond with ONLY valid JSON in this exact format:
{
  "posts": [
    {
      "hook": "string",
      "value": "string",
      "social_proof": "string",
      "cta": "string",
      "hashtags": ["string"],
      "baseCaption": "string (hook + newline + value + newline + social_proof + newline + cta + newline + hashtags joined)",
      "platform": "${platforms[0]}",
      "platformVariants": {
        "linkedin": "string",
        "instagram": "string",
        "facebook": "string",
        "x": "string"
      }
    }
  ]
}`;
}

function scoreAndProcessPosts(posts, platforms) {
  return posts.map(post => {
    const platform = post.platform || platforms[0] || 'instagram';
    const hashtags = Array.isArray(post.hashtags) ? post.hashtags : [];

    const rawQuality = scoreSocialPost({
      platform,
      content: post.baseCaption || '',
      hashtags,
      cta_present: !!(post.cta),
    });

    const processed = postProcessSocial({
      platform,
      content: post.baseCaption || '',
      hashtags,
    });

    const quality = scoreSocialPost({
      platform,
      content: processed.content,
      hashtags: processed.hashtags,
      cta_present: !!(post.cta),
    });

    return {
      ...post,
      baseCaption: processed.content || post.baseCaption,
      hashtags: processed.hashtags.length ? processed.hashtags : hashtags,
      quality_score_raw: rawQuality.score,
      quality_score: quality.score,
      quality_grade: quality.grade,
      quality_breakdown: quality.breakdown,
    };
  });
}

/* ======================================================
   POST /api/customer/ai/social/generate
====================================================== */

export async function generateSocialContent(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const db = getDB(env);
  await checkAndIncrement(db, auth.user_id, "ai");

  let payload;
  try { payload = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const {
    intention  = "awareness",
    platforms  = ["linkedin"],
    tone       = "professional",
    cta        = "Learn More",
    count      = 1,
  } = payload || {};

  if (!intention) return error("intention is required", "BAD_REQUEST", null, 400);

  const validPlatforms = platforms.filter(p => ALLOWED_PLATFORMS.includes(p));

  // Fetch unified brand context (standard depth: voice + audience + pillars)
  const dnaCtx = await fetchBrandContext(db, auth.brand_id, 'standard');

  // Phase 6 — Generation Memory: load recent hooks to avoid repetition
  const recentHooks = await loadRecentHooks(db, auth.brand_id, 5);

  // Phase 6 — Context hash for deduplication tracking
  const ctxHash = await contextHash(auth.brand_id, 'social', intention);

  const promptParams = {
    brandContext: dnaCtx.context || `Brand: ${dnaCtx.brand?.name || "Unknown Brand"}`,
    forbidden: dnaCtx.forbidden,
    intention,
    tone,
    ctaLabel: cta,
    platforms: validPlatforms.length ? validPlatforms : ["linkedin"],
    count: Math.min(count, 3),
    recentHooks,
  };

  const prompt = buildPrompt(promptParams);

  // First generation attempt
  const result = await trackedRunLLM(env, {
    brand: dnaCtx.brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id,
    content_type: "social",
    platform: validPlatforms[0] || null,
    options: { systemPromptType: 'social' },
    context_hash: ctxHash,
  });

  let scoredPosts = scoreAndProcessPosts(result?.posts || [], validPlatforms);

  // Phase 1 — Quality Loop: retry once if best score < 70
  const bestScore = scoredPosts.length ? Math.max(...scoredPosts.map(p => p.quality_score)) : 0;

  if (bestScore < 70) {
    await checkAndIncrement(db, auth.user_id, "ai");
    const retryResult = await trackedRunLLM(env, {
      brand: dnaCtx.brand || {},
      prompt,
      brand_id: auth.brand_id,
      user_id: auth.user_id,
      content_type: "social",
      platform: validPlatforms[0] || null,
      options: { systemPromptType: 'social' },
      context_hash: ctxHash,
    });

    if (retryResult?.posts?.length) {
      const retryScored = scoreAndProcessPosts(retryResult.posts, validPlatforms);
      const retryBest = Math.max(...retryScored.map(p => p.quality_score));
      if (retryBest > bestScore) {
        scoredPosts = retryScored;
      }
    }
  }

  if (scoredPosts.length === 0) {
    return json({ error: "AI service temporarily unavailable. Please try again." }, 503);
  }

  return json({
    posts: scoredPosts,
    brand_name: dnaCtx.brand?.name || null,
    quality_loop_active: true,
  });
}
