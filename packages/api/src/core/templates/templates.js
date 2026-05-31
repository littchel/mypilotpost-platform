import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { trackedRunLLM } from "../ai/ai_client.js";

const POST_DAILY_LIMIT = 3;

// ── Campaign Plan Generator (kept for backward compatibility) ─────────────────

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
    brand: brandCtx, prompt,
    brand_id: auth.brand_id, user_id: auth.user_id || null,
    content_type: "campaign_plan", options: { mode: "deep" },
  });

  if (!result) return error("Failed to generate campaign. Please try again.", "AI_ERROR", null, 500);

  const campaignId   = crypto.randomUUID();
  const campaignName = result.campaign_name || `${goal} Campaign`;
  const objectiveKey = goal.toLowerCase().replace(/\s+/g, "_");

  await db.prepare(`
    INSERT INTO campaigns (id, brand_id, name, objective_type, objective_text, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
  `).bind(campaignId, auth.brand_id, campaignName, objectiveKey, result.campaign_objective || goal).run();

  return json({ id: campaignId, goal, ...result });
}

// ── Goal Recommendation Generator ─────────────────────────────────────────────
// Returns a planning document only. Does NOT create a campaign record.

export async function generateRecommendation(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const body = await request.json();
  const { goal } = body;
  if (!goal) return error("Goal is required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  const [brand, profile, intelResult, connectionsResult] = await Promise.all([
    db.prepare("SELECT name, industry, tone FROM brands WHERE id = ?").bind(auth.brand_id).first(),
    db.prepare("SELECT industry, value_proposition, brand_personality FROM brand_dna_profiles WHERE brand_id = ?").bind(auth.brand_id).first(),
    db.prepare(`
      SELECT title, finding, category, expected_impact
      FROM brand_intelligence_queue
      WHERE brand_id = ? AND dismissed_at IS NULL
      ORDER BY priority_rank ASC
      LIMIT 5
    `).bind(auth.brand_id).all(),
    db.prepare("SELECT platform FROM social_connections WHERE brand_id = ? AND status = 'active'").bind(auth.brand_id).all(),
  ]);

  const brandName     = brand?.name || "this brand";
  const industry      = profile?.industry || brand?.industry || "General";
  const valueProp     = profile?.value_proposition || "";
  const personality   = profile?.brand_personality || "";
  const platforms     = (connectionsResult.results || []).map(c => c.platform).join(", ") || "not specified";
  const intelligence  = (intelResult.results || [])
    .map(i => `• [${i.category}] ${i.finding}`)
    .join("\n") || "No recent intelligence available.";

  const prompt = `You are a senior digital marketing strategist generating a strategic content recommendation for a real brand. This is planning advice — do not create a campaign, create a recommendation document.

BRAND
Name: ${brandName}
Industry: ${industry}
Value Proposition: ${valueProp || "not specified"}
Brand Personality: ${personality || "not specified"}
Active Platforms: ${platforms}

CURRENT BRAND INTELLIGENCE (what is happening for this brand right now)
${intelligence}

GOAL: ${goal}

Generate a specific, opinionated recommendation based on this brand's actual situation. Do not use generic advice.

Return ONLY this JSON object:
{
  "goal": "${goal}",
  "why_this_goal_now": "2-3 sentences — why this goal is right for this specific brand at this moment, grounded in the intelligence data above",
  "recommended_content_mix": [
    {"type": "content type name", "percentage": "40%", "reason": "why this type serves this goal for this brand"},
    {"type": "content type name", "percentage": "35%", "reason": "why"},
    {"type": "content type name", "percentage": "25%", "reason": "why"}
  ],
  "publishing_frequency": "e.g. 4x per week — Mon/Wed/Thu/Sat",
  "recommended_platforms": ["platform1", "platform2"],
  "content_themes": ["specific theme 1", "specific theme 2", "specific theme 3", "specific theme 4"],
  "campaign_concept": "one powerful, specific campaign idea tailored to this brand and goal",
  "first_7_days": ["Day 1: specific action", "Day 3: specific action", "Day 5: specific action", "Day 7: specific action"],
  "success_signals": ["what to watch in week 1", "what to watch in week 2"]
}

Respond with only the JSON object. No markdown. No explanation.`;

  const brandCtx = profile || brand || {};
  const result = await trackedRunLLM(env, {
    brand: brandCtx, prompt,
    brand_id: auth.brand_id, user_id: auth.user_id || null,
    content_type: "goal_recommendation", options: { mode: "deep" },
  });

  if (!result) return error("Failed to generate recommendation. Please try again.", "AI_ERROR", null, 500);

  return json({ goal, ...result });
}

// ── Post Idea Generator ───────────────────────────────────────────────────────

export async function generatePostIdea(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const db = getDB(env);
  const today = new Date().toISOString().slice(0, 10);

  const countRow = await db.prepare(`
    SELECT COUNT(*) as count FROM ai_generations
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

  const [brand, profile, intelResult, connectionsResult] = await Promise.all([
    db.prepare("SELECT name, industry, tone FROM brands WHERE id = ?").bind(auth.brand_id).first(),
    db.prepare("SELECT industry, value_proposition, brand_personality FROM brand_dna_profiles WHERE brand_id = ?").bind(auth.brand_id).first(),
    db.prepare(`
      SELECT finding, category FROM brand_intelligence_queue
      WHERE brand_id = ? AND dismissed_at IS NULL
      ORDER BY priority_rank ASC LIMIT 3
    `).bind(auth.brand_id).all(),
    db.prepare("SELECT platform FROM social_connections WHERE brand_id = ? AND status = 'active'").bind(auth.brand_id).all(),
  ]);

  const brandName   = brand?.name || "this brand";
  const industry    = profile?.industry || brand?.industry || "General";
  const valueProp   = profile?.value_proposition || "";
  const personality = profile?.brand_personality || "";
  const brandVoice  = brand?.tone || "";
  const platforms   = (connectionsResult.results || []).map(c => c.platform).join(", ") || "not specified";
  const intelligence = (intelResult.results || [])
    .map(i => `• [${i.category}] ${i.finding}`)
    .join("\n") || "No recent intelligence.";

  const prompt = `You are a content strategist writing for a specific brand. Your job is to generate a post strategy that feels like it came from someone who deeply understands this brand — not generic AI output.

BRAND CONTEXT
Name: ${brandName}
Industry: ${industry}
Value Proposition: ${valueProp || "not specified"}
Brand Personality: ${personality || "not specified"}
Brand Voice: ${brandVoice || "not specified"}
Active Platforms: ${platforms}

CURRENT BRAND INTELLIGENCE (use this to make the content specific and timely)
${intelligence}

POST FRAMEWORK: ${framework}

Your task: Generate a high-quality, opinionated post strategy for ${brandName} using the ${framework} framework. The content must:
- Be specific to this industry and this brand's actual situation
- Reference what is happening for this brand right now (from the intelligence above) where relevant
- Have a hook that stops the scroll — surprising, specific, or provocative
- Avoid motivational fluff, generic business advice, recycled AI language, or empty listicles
- Sound like a real person with a point of view, not a content mill

Return ONLY this JSON object:
{
  "post_angle": "the specific, opinionated angle for this brand — why this topic, why now, what makes it theirs",
  "suggested_hook": "opening line that stops the scroll — specific, not generic, max 15 words",
  "key_message": "the one thing the audience should take away from this post",
  "post_structure": ["opening — hook + context", "body point 1", "body point 2", "tension or pivot", "resolution", "CTA"],
  "suggested_cta": "specific call-to-action — not 'comment below' or generic phrases",
  "visual_type": "e.g. Single Image, Carousel, Short Video, Quote Card, Talking Head",
  "canva_asset": "specific Canva template type e.g. LinkedIn Carousel 1080x1080, Instagram Story 1080x1920"
}

Respond with only the JSON object. No markdown. No explanation.`;

  const brandCtx = profile || brand || {};
  const result = await trackedRunLLM(env, {
    brand: brandCtx, prompt,
    brand_id: auth.brand_id, user_id: auth.user_id || null,
    content_type: "post_idea", options: { mode: "fast" },
  });

  if (!result) return error("Failed to generate post idea. Please try again.", "AI_ERROR", null, 500);

  return json({ framework, ...result });
}

// ── Visual Brief Generator ────────────────────────────────────────────────────

// Static search keywords per content idea type — injected with brand industry at runtime
const IDEA_KEYWORDS = {
  "Myth vs Reality":       ["misconception truth reveal", "fact vs fiction", "professional clarity"],
  "Behind The Scenes":     ["behind the scenes authentic", "real process workplace", "team working"],
  "Mistakes To Avoid":     ["common mistakes warning", "professional advice caution", "avoid errors"],
  "Before & After":        ["transformation before after", "results improvement comparison", "success journey"],
  "Customer Story":        ["happy customer testimonial", "client success story", "people smiling service"],
  "FAQ":                   ["questions answers professional", "help desk support", "FAQ business"],
  "Industry Prediction":   ["future technology innovation", "industry forecast trend", "bold vision prediction"],
  "Unpopular Opinion":     ["bold statement contrast", "challenge convention", "strong opinion standout"],
  "Problem / Solution":    ["problem solving professional", "solution success outcome", "challenge overcome"],
  "Founder Insight":       ["founder entrepreneur leadership", "business insight professional", "executive portrait"],
  "Top Tips":              ["tips advice professional", "top list best practices", "expert guidance"],
  "Checklist":             ["checklist tasks organised", "step by step process", "planning preparation"],
  "Lessons Learned":       ["lessons wisdom reflection", "experience learning growth", "professional insight"],
  "Common Questions":      ["FAQ common questions", "helpful guide answers", "customer support"],
  "Industry Reaction":     ["industry news reaction", "breaking news professional", "market update"],
  "Case Study":            ["case study results metrics", "business success numbers", "data achievement"],
  "Trend Analysis":        ["trend analysis data chart", "market trends business", "industry shift"],
  "Community Question":    ["community conversation engagement", "people talking discussion", "audience interaction"],
  "Success Story":         ["success milestone celebration", "achievement proud moment", "business growth"],
  "Quick Win":             ["quick tip action result", "simple solution immediate", "easy win productivity"],
};

export async function generateVisualBrief(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const body = await request.json();
  const { idea_name } = body;
  if (!idea_name) return error("idea_name is required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  const [brand, profile] = await Promise.all([
    db.prepare("SELECT name, industry FROM brands WHERE id = ?").bind(auth.brand_id).first(),
    db.prepare("SELECT industry FROM brand_dna_profiles WHERE brand_id = ?").bind(auth.brand_id).first(),
  ]);

  const industry = profile?.industry || brand?.industry || "";
  const baseKeywords = IDEA_KEYWORDS[idea_name] || ["professional business content", "brand marketing"];
  const industryTerm = industry ? industry.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim() : "";

  // Build 2-3 personalised search queries
  const queries = baseKeywords.slice(0, 2).map(kw =>
    industryTerm ? `${industryTerm} ${kw}` : kw
  );

  // Fetch images from Freepik (graceful no-op if key missing)
  let images = [];
  let videos = [];

  if (env.FREEPIK_API_KEY) {
    try {
      const imgResults = await Promise.all(
        queries.map(q =>
          fetch(
            `https://api.freepik.com/v1/resources?query=${encodeURIComponent(q)}&limit=2&filters[content_type][photo]=1`,
            { headers: { "Accept-Language": "en-US", "X-Freepik-API-Key": env.FREEPIK_API_KEY } }
          ).then(r => r.ok ? r.json() : { data: [] })
        )
      );
      images = imgResults
        .flatMap(r => r.data || [])
        .slice(0, 3)
        .map(item => ({
          id:    item.id,
          url:   item.previews?.[0]?.url || item.thumbnail?.url || null,
          title: item.title || "",
          link:  item.url || `https://www.freepik.com`,
        }))
        .filter(i => i.url);
    } catch {}

    try {
      const vidRes = await fetch(
        `https://api.freepik.com/v1/videos?query=${encodeURIComponent(queries[0])}&limit=2`,
        { headers: { "Accept-Language": "en-US", "X-Freepik-API-Key": env.FREEPIK_API_KEY } }
      );
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        videos = (vidData.data || []).slice(0, 2).map(item => ({
          id:    item.id,
          url:   item.previews?.[0]?.url || item.thumbnail?.url || null,
          title: item.title || "",
          link:  item.url || `https://www.freepik.com`,
        })).filter(i => i.url);
      }
    } catch {}
  }

  return json({ idea_name, industry: industryTerm, queries, images, videos });
}
