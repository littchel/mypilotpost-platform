/**
 * AI Regeneration Engine
 * POST /api/customer/ai/regenerate
 *
 * Regenerates from a previous ai_generations record, preserving lineage.
 * Stores parent_generation_id for full generation history.
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import { trackedRunLLM } from "./ai_client.js";
import { scoreSocialPost, scoreBlogArticle } from "./quality.js";
import { postProcessSocial, postProcessBlog } from "./postprocess.js";
import { fetchBrandContext, contextHash } from "./brand_context.js";

export async function regenerateContent(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const db = getDB(env);
  await checkAndIncrement(db, auth.user_id, "ai");

  let body;
  try { body = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const {
    generation_id,
    reason          = "",
    preserve_angle  = false,
  } = body || {};

  if (!generation_id) return error("generation_id is required", "BAD_REQUEST", null, 400);

  // Load the original generation record
  const original = await db.prepare(`
    SELECT id, brand_id, content_type, platform, input_prompt, output, model, quality_score
    FROM ai_generations
    WHERE id = ? AND brand_id = ?
  `).bind(generation_id, auth.brand_id).first();

  if (!original) return error("Generation not found", "NOT_FOUND", null, 404);

  // Build a fresh prompt with variation hint
  const variationHint = reason
    ? `\n\nREGENERATION NOTE: ${reason}. Generate a distinctly different version.`
    : "\n\nREGENERATION: Generate a completely fresh version with a different angle, hook, and structure.";

  const preserveHint = preserve_angle
    ? "\nPRESERVE: Keep the same strategic angle and objective, just express it differently."
    : "";

  const basePrompt = (original.input_prompt || "").slice(0, 2000);
  const newPrompt = basePrompt + variationHint + preserveHint;

  const dnaCtx = await fetchBrandContext(db, auth.brand_id, 'standard');
  const ctxHash = await contextHash(auth.brand_id, original.content_type, `regen|${generation_id}`);

  // Determine system prompt type from original content_type
  const systemPromptTypeMap = {
    social: 'social', blog: 'blog', campaign: 'campaign',
    rewrite: 'rewrite', studio: 'studio', grammar: 'grammar', hashtags: 'hashtags',
  };
  const systemPromptType = systemPromptTypeMap[original.content_type] || 'social';

  const result = await trackedRunLLM(env, {
    brand: dnaCtx.brand || {},
    prompt: newPrompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id,
    content_type: original.content_type,
    platform: original.platform || null,
    options: { systemPromptType },
    parent_generation_id: generation_id,
    context_hash: ctxHash,
  });

  if (!result) {
    return error("Regeneration failed. Please try again.", "GENERATION_FAILED", null, 503);
  }

  // Score social posts
  let quality = null;
  if (original.content_type === 'social' && original.platform) {
    const posts = result?.posts || [];
    if (posts.length) {
      const post = posts[0];
      const processed = postProcessSocial({ platform: original.platform, content: post.baseCaption || '', hashtags: post.hashtags || [] });
      quality = scoreSocialPost({ platform: original.platform, content: processed.content, hashtags: processed.hashtags, cta_present: !!(post.cta) });
    }
  } else if (original.content_type === 'blog' && result?.body) {
    const { title, body } = postProcessBlog({ title: result.title || '', body: result.body, primary_keyword: '' });
    quality = scoreBlogArticle({ title, body, primary_keyword: '' });
  }

  return json({
    result,
    parent_generation_id: generation_id,
    generation_id: result._generation_id || null,
    content_type: original.content_type,
    platform: original.platform || null,
    original_quality_score: original.quality_score || null,
    quality: quality ? { score: quality.score, grade: quality.grade, breakdown: quality.breakdown } : null,
  });
}
