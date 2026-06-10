/**
 * AI Rewrite Engine
 * POST /api/customer/ai/rewrite
 *
 * Rewrites existing content while preserving brand voice.
 * Never overwrites the original content_vault record.
 *
 * Modes: rewrite | shorten | expand | professional | casual | platform_adapt
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import { trackedRunLLM } from "./ai_client.js";
import { scoreSocialPost, scoreBlogArticle } from "./quality.js";
import { postProcessSocial } from "./postprocess.js";
import { fetchBrandContext, contextHash } from "./brand_context.js";

const REWRITE_MODES = ["rewrite", "shorten", "expand", "professional", "casual", "platform_adapt"];

const MODE_INSTRUCTIONS = {
  rewrite:        "Rewrite this content completely while keeping the same core message and intent. Use a fresh angle and different phrasing.",
  shorten:        "Condense this content to its most impactful form. Remove all filler, keep only what drives the point home. Aim for 40-60% of original length.",
  expand:         "Expand this content with more depth, specifics, and value. Add concrete examples, data points, or elaboration. Preserve the original structure.",
  professional:   "Rewrite in a polished, professional tone. Remove casual language, slang, or emojis. Strengthen the vocabulary and structure.",
  casual:         "Rewrite in a conversational, human tone. Make it feel like a real person talking, not a press release. Keep it warm and direct.",
  platform_adapt: "Adapt this content for the target platform's specific format, character limits, and audience expectations.",
};

function buildRewritePrompt({ originalContent, brandContext, forbidden, mode, platform, goal, tone }) {
  const modeInstruction = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.rewrite;
  const forbiddenList = forbidden.slice(0, 10).map(f => `"${f}"`).join(", ");
  const platformLine = platform ? `\nTarget Platform: ${platform}` : "";
  const goalLine = goal ? `\nRewrite Goal: ${goal}` : "";
  const toneLine = tone ? `\nTone: ${tone}` : "";

  return `You are a brand editor rewriting content to better match brand voice and quality standards.

BRAND CONTEXT:
${brandContext}

ORIGINAL CONTENT:
"${originalContent.slice(0, 2000)}"

REWRITE MODE: ${mode}
${modeInstruction}${platformLine}${goalLine}${toneLine}

FORBIDDEN PHRASES (never use): ${forbiddenList}

RULES:
- Preserve the core message, facts, and intent
- Write in the brand's documented voice and style
- The output must be distinctly different from the input — not just minor word swaps
- Never introduce claims or facts not present in the original

Respond in strict JSON:
{
  "rewritten": "the rewritten content",
  "summary_of_changes": "one sentence describing what changed and why",
  "mode": "${mode}"
}`;
}

export async function rewriteContent(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const db = getDB(env);
  await checkAndIncrement(db, auth.user_id, "ai");

  let body;
  try { body = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const {
    content_id,
    text,
    mode     = "rewrite",
    platform = null,
    tone     = null,
    goal     = null,
    length   = null,
  } = body || {};

  if (!REWRITE_MODES.includes(mode)) {
    return error(`mode must be one of: ${REWRITE_MODES.join(", ")}`, "INVALID_MODE", null, 400);
  }

  // Resolve content: prefer content_id lookup, fall back to raw text
  let originalContent = text || "";
  let sourceContentId = content_id || null;

  if (content_id) {
    const vault = await db.prepare(
      "SELECT body, title, content_type FROM content_vault WHERE id = ? AND brand_id = ?"
    ).bind(content_id, auth.brand_id).first();

    if (!vault) return error("Content not found", "NOT_FOUND", null, 404);

    // For blog, combine title + body; for social, use body
    originalContent = vault.content_type === 'blog' && vault.title
      ? `${vault.title}\n\n${vault.body}`
      : (vault.body || "");
  }

  if (!originalContent?.trim()) {
    return error("content_id or text is required", "BAD_REQUEST", null, 400);
  }

  const dnaCtx = await fetchBrandContext(db, auth.brand_id, 'standard');
  const ctxHash = await contextHash(auth.brand_id, 'rewrite', `${mode}|${platform || ''}|${originalContent.slice(0, 100)}`);

  const prompt = buildRewritePrompt({
    originalContent,
    brandContext: dnaCtx.context || `Brand: ${dnaCtx.brand?.name || "Unknown Brand"}`,
    forbidden: dnaCtx.forbidden,
    mode,
    platform,
    goal,
    tone,
  });

  const result = await trackedRunLLM(env, {
    brand: dnaCtx.brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id,
    content_type: "rewrite",
    platform,
    options: { systemPromptType: 'rewrite' },
    context_hash: ctxHash,
  });

  if (!result?.rewritten) {
    return error("Rewrite failed. Please try again.", "GENERATION_FAILED", null, 503);
  }

  // Score the output if platform is known (social post)
  let quality = null;
  if (platform) {
    const processed = postProcessSocial({ platform, content: result.rewritten, hashtags: [] });
    quality = scoreSocialPost({ platform, content: processed.content, hashtags: [], cta_present: false });
  }

  return json({
    rewritten: result.rewritten,
    summary_of_changes: result.summary_of_changes || null,
    mode,
    original_content_id: sourceContentId,
    quality: quality ? { score: quality.score, grade: quality.grade, breakdown: quality.breakdown } : null,
    brand_name: dnaCtx.brand?.name || null,
  });
}
