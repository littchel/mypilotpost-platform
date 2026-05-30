import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { trackedRunLLM } from "../ai/ai_client.js";

const POST_DAILY_LIMIT = 3;

// ── Campaign Plan Generator ───────────────────────────────────────────────────

export async function generateCampaignPlan(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const body = await request.json();
  const { goal } = body;
  if (!goal) return error("Goal is required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  const [brand, profile, intelligenceResult, connectionsResult] = await Promise.all([
    db.prepare("SELECT name, industry, tone FROM brands WHERE id = ?").bind(auth.brand_id).first(),
    db.prepare("SELECT industry, value_proposition, brand_personality FROM brand_dna_profiles WHERE brand_id = ?").bind(auth.brand_id).first(),
    db.prepare(`
      SELECT title, finding, category, expected_impact
      FROM brand_intelligence_queue
      WHERE brand_id = ? AND dismissed_at IS NULL
      ORDER BY priority_rank ASC, generated_at DESC
      LIMIT 5
    `).bind(auth.brand_id).all(),
    db.prepare("SELECT platform FROM social_connections WHERE brand_id = ? AND status = 'active'").bind(auth.brand_id).all(),
  ]);

  const brandName = brand?.name || "this brand";
  const industry  = profile?.industry || brand?.industry || "General";
  const platforms = (connectionsResult.results || []).map(c => c.platform).join(", ") || "Instagram, LinkedIn";
  const intelCtx  = (intelligenceResult.results || [])
    .map(i => `[${i.category}] ${i.finding}`)
    .join("\n") || "No recent intelligence available.";

  const prompt = `You are a senior digital marketing strategist building a campaign plan for a real brand.

Brand: ${brandName}
Industry: ${industry}
Active Platforms: ${platforms}
Growth Goal: ${goal}

Recent Brand Intelligence:
${intelCtx}

Generate a complete strategic campaign plan as strict JSON with these exact keys:
{
  "campaign_name": "specific, punchy campaign name",
  "campaign_objective": "one sentence — what this campaign achieves",
  "why_this_campaign": "2-3 sentences — why this goal matters for this brand right now",
  "expected_outcome": "specific measurable outcome",
  "estimated_effort": "Low | Medium | High",
  "duration": "e.g. 2 weeks or 30 days",
  "content_series": ["series idea 1", "series idea 2", "series idea 3"],
  "content_themes": ["theme 1", "theme 2", "theme 3"],
  "cta_strategy": "primary call-to-action approach for this campaign",
  "comment_trigger": {
    "trigger_word": "one word e.g. GUIDE",
    "why_it_works": "one sentence",
    "expected_result": "one sentence",
    "follow_up_action": "one sentence"
  },
  "canva_assets": ["Carousel", "Story", "Quote Card"],
  "publishing_schedule": "e.g. 3x per week, Mon/Wed/Fri",
  "success_metrics": ["metric 1", "metric 2", "metric 3"]
}

Respond with only the JSON object. No markdown. No explanation.`;

  const brandCtx = profile || brand || { archetype: "Strategic Builder" };
  const result = await trackedRunLLM(env, {
    brand: brandCtx,
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "campaign_plan",
    options: { mode: "deep" },
  });

  if (!result) return error("Failed to generate campaign. Please try again.", "AI_ERROR", null, 500);

  const campaignId   = crypto.randomUUID();
  const campaignName = result.campaign_name || `${goal} Campaign`;
  const objectiveKey = goal.toLowerCase().replace(/\s+/g, "_");

  await db.prepare(`
    INSERT INTO campaigns (id, brand_id, name, objective_type, objective_text, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
  `).bind(
    campaignId, auth.brand_id, campaignName, objectiveKey,
    result.campaign_objective || goal,
  ).run();

  return json({ id: campaignId, goal, ...result });
}

// ── Post Idea Generator ───────────────────────────────────────────────────────

export async function generatePostIdea(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const db = getDB(env);
  const today = new Date().toISOString().slice(0, 10);

  // Server-side daily limit — counts post_idea generations today
  const countRow = await db.prepare(`
    SELECT COUNT(*) as count
    FROM ai_generations
    WHERE brand_id = ? AND content_type = 'post_idea' AND DATE(created_at) = ?
  `).bind(auth.brand_id, today).first();

  if ((countRow?.count || 0) >= POST_DAILY_LIMIT) {
    return error(
      "You have reached today's custom generation limit. More generations become available tomorrow.",
      "RATE_LIMIT_EXCEEDED", null, 429,
    );
  }

  const body = await request.json();
  const { framework } = body;
  if (!framework) return error("Framework is required", "BAD_REQUEST", null, 400);

  const [brand, profile] = await Promise.all([
    db.prepare("SELECT name, industry FROM brands WHERE id = ?").bind(auth.brand_id).first(),
    db.prepare("SELECT industry, value_proposition FROM brand_dna_profiles WHERE brand_id = ?").bind(auth.brand_id).first(),
  ]);

  const industry  = profile?.industry || brand?.industry || "General";
  const brandName = brand?.name || "this brand";

  const prompt = `You are a social media content strategist.

Brand: ${brandName}
Industry: ${industry}
Post Framework: ${framework}

Generate a post strategy guide as strict JSON with these exact keys:
{
  "post_angle": "the specific angle or spin to make this framework compelling for this brand",
  "post_structure": ["step 1", "step 2", "step 3", "step 4"],
  "suggested_hook": "opening line that stops the scroll — specific, not generic",
  "suggested_cta": "specific call-to-action line",
  "visual_type": "e.g. Single Image, Carousel, Short Video, Quote Card",
  "canva_asset": "recommended Canva template type e.g. Instagram Carousel, Story"
}

Respond with only the JSON object. No markdown. No explanation.`;

  const brandCtx = profile || brand || { archetype: "Strategic Builder" };
  const result = await trackedRunLLM(env, {
    brand: brandCtx,
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "post_idea",
    options: { mode: "fast" },
  });

  if (!result) return error("Failed to generate post idea. Please try again.", "AI_ERROR", null, 500);

  return json({ framework, ...result });
}
