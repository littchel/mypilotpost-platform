// packages/api/src/core/studio/studio.js
// myPilotPost AI Content Studio — Generation Engine

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { trackedRunLLM } from "../ai/ai_client.js";

// ── Brand context ─────────────────────────────────────────────────────────────
async function fetchBrandCtx(db, brand_id) {
  const [brand, profile, voice, audience, pillars, connections] = await Promise.all([
    db.prepare("SELECT id, name, industry, tone FROM brands WHERE id = ?").bind(brand_id).first(),
    db.prepare("SELECT mission, value_proposition, brand_personality, positioning FROM brand_dna_profiles WHERE brand_id = ?").bind(brand_id).first(),
    db.prepare("SELECT voice_traits, messaging_style FROM brand_dna_voice WHERE brand_id = ?").bind(brand_id).first(),
    db.prepare("SELECT icp_name, pain_points FROM brand_dna_audience WHERE brand_id = ?").bind(brand_id).first(),
    db.prepare("SELECT title FROM brand_dna_content_pillars WHERE brand_id = ? LIMIT 5").bind(brand_id).all(),
    db.prepare("SELECT platform FROM social_connections WHERE brand_id = ? AND status = 'active'").bind(brand_id).all(),
  ]);

  const parts = [];
  if (brand?.name)                parts.push(`Brand: ${brand.name}`);
  if (brand?.industry)            parts.push(`Industry: ${brand.industry}`);
  if (profile?.positioning)       parts.push(`Positioning: ${profile.positioning}`);
  if (profile?.value_proposition) parts.push(`Value Proposition: ${profile.value_proposition}`);
  if (profile?.mission)           parts.push(`Mission: ${profile.mission}`);
  if (voice?.messaging_style)     parts.push(`Messaging Style: ${voice.messaging_style}`);
  if (audience?.icp_name)         parts.push(`Audience: ${audience.icp_name}`);
  const pillarList = (pillars?.results || []).map(p => p.title).filter(Boolean);
  if (pillarList.length) parts.push(`Content Pillars: ${pillarList.join(", ")}`);

  return {
    brand,
    context: parts.join("\n"),
    brandName: brand?.name || "this brand",
    industry: profile?.industry || brand?.industry || "General",
    activePlatforms: (connections?.results || []).map(c => c.platform),
  };
}

// ── GET /api/customer/studio/opportunities ────────────────────────────────────
// Generate 20 content opportunities for the Posts tab
export async function getStudioOpportunities(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const { brand, context, brandName, industry, activePlatforms } = await fetchBrandCtx(db, auth.brand_id);
  const platforms = activePlatforms.length ? activePlatforms.join(", ") : "Facebook, Instagram, LinkedIn";
  const month = new Date().toLocaleString("en", { month: "long" });

  const prompt = `You are a content strategist creating a daily content opportunity briefing.

BRAND CONTEXT:
${context || `Brand: ${brandName}\nIndustry: ${industry}`}

ACTIVE PLATFORMS: ${platforms}
CURRENT MONTH: ${month}

Generate exactly 20 specific content opportunities for ${brandName}. Each must be grounded in this brand, not generic.

Return ONLY this JSON object:
{
  "opportunities": [
    {
      "id": 1,
      "framework": "Myth vs Reality",
      "idea": "specific post concept for this brand",
      "hook": "scroll-stopping opening line — max 12 words, never generic",
      "objective": "one short goal: build trust / generate leads / etc.",
      "platforms": ["platform1", "platform2"],
      "media_type": "text_only",
      "effort": "low"
    }
  ]
}

Rules:
- Use these frameworks (no repeats): Myth vs Reality, Behind the Scenes, Mistakes to Avoid, Before & After, Customer Story, FAQ, Stat + Commentary, How-To, Opinion Take, Trend Commentary, Case Study, Product Feature, Team Story, Industry News, Social Proof, Challenge, Listicle, Question, Announcement, Seasonal
- platforms must be from: ${platforms}
- effort values: low, medium, high  — distribute ~8/8/4
- media_type values: text_only, single_image, carousel, short_video, quote_card
- hooks must be surprising, specific, contrarian — never "Are you ready?" or "Did you know?"
- Respond with valid JSON only. No markdown.`;

  const result = await trackedRunLLM(env, {
    brand: brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "studio_opportunities",
    options: { mode: "deep" },
  });

  const opps = result?.opportunities;
  if (!opps?.length) {
    return json({ opportunities: buildFallbackOpps(brandName, industry, activePlatforms) });
  }

  return json({ opportunities: opps.slice(0, 20) });
}

// ── POST /api/customer/studio/generate-post ───────────────────────────────────
// Expand a single opportunity into full post content
export async function generateStudioPost(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const { framework, idea, hook, platforms = [] } = body;
  if (!framework) return error("framework is required", 400);

  const db = getDB(env);
  const { brand, context, brandName } = await fetchBrandCtx(db, auth.brand_id);
  const platformList = platforms.join(", ") || "Facebook, Instagram";

  const prompt = `You are a copywriter generating a complete social post for a brand.

BRAND CONTEXT:
${context || `Brand: ${brandName}`}

FRAMEWORK: ${framework}
CONCEPT: ${idea || ""}
HOOK: ${hook || ""}
PLATFORMS: ${platformList}

Write the complete post. Return ONLY this JSON:
{
  "body": "complete post text ready to use — not a template, an actual post",
  "hook": "refined opening line",
  "cta": "specific call to action",
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5",
  "platform_variants": {
    "instagram": "instagram-specific variant if different",
    "linkedin": "linkedin-specific variant if different"
  }
}

Rules:
- Write the actual post, not a description of what to write
- Body should be 80-220 words
- No [PLACEHOLDER] text — it must be complete and publishable
- No generic openers, no "Excited to share", no "Game changer"
- Respond with JSON only. No markdown.`;

  const result = await trackedRunLLM(env, {
    brand: brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "studio_post",
    options: { mode: "deep" },
  });

  if (!result?.body) return error("Generation failed. Try again.", 500);

  return json({
    body: result.body,
    hook: result.hook || hook || "",
    cta: result.cta || "",
    hashtags: result.hashtags || "",
    platform_variants: result.platform_variants || {},
  });
}

// ── POST /api/customer/studio/playbook ────────────────────────────────────────
// Run a playbook to generate a structured content plan
export async function runPlaybook(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const { playbook_type, industry: reqIndustry, input_data, intensity = "standard", channels = [] } = body;
  if (!playbook_type) return error("playbook_type is required", 400);

  const db = getDB(env);
  const { brand, context, brandName, industry } = await fetchBrandCtx(db, auth.brand_id);

  const targetIndustry = reqIndustry || industry;
  const postCount = intensity === "minimal" ? 3 : intensity === "full" ? 5 : 4;
  const channelList = channels.length ? channels.join(", ") : "Facebook, Instagram, LinkedIn";
  const inputSummary = typeof input_data === "string"
    ? input_data
    : JSON.stringify(input_data || {}, null, 2);

  const prompt = `You are a senior content strategist executing a ${playbook_type} playbook.

BRAND CONTEXT:
${context || `Brand: ${brandName}\nIndustry: ${targetIndustry}`}

PLAYBOOK: ${playbook_type}
INDUSTRY: ${targetIndustry}
CHANNELS: ${channelList}

BRAND/PRODUCT DATA:
${inputSummary}

Generate ${postCount} high-quality content pieces for this playbook. Return ONLY this JSON:
{
  "summary": "2-sentence plan overview specific to this brand and playbook",
  "modules": [
    {
      "type": "social_post",
      "platform": "platform name",
      "title": "module title",
      "body": "complete, ready-to-use post content — not a template",
      "hook": "opening line",
      "cta": "specific call to action",
      "media_suggestion": "brief visual direction"
    }
  ],
  "media_requirements": ["specific asset 1", "specific asset 2"],
  "schedule_suggestion": "1-sentence scheduling recommendation"
}

Rules:
- Every body field must be a complete, publishable post — no [PLACEHOLDERS]
- Reference the brand/product data above directly in the content
- Mix post types across modules
- Respond with JSON only. No markdown.`;

  const result = await trackedRunLLM(env, {
    brand: brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "studio_playbook",
    options: { mode: "deep" },
  });

  if (!result) return error("Generation failed. Please try again.", 500);

  return json({
    playbook_type,
    intensity,
    summary: result.summary || `${playbook_type} content plan for ${brandName}.`,
    modules: (result.modules || []).slice(0, 5),
    media_requirements: result.media_requirements || [],
    schedule_suggestion: result.schedule_suggestion || "",
  });
}

// ── POST /api/customer/studio/campaign ────────────────────────────────────────
// Generate a full campaign asset set
export async function generateCampaignContent(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const { campaign_name, offer, goal, channels = [] } = body;
  if (!campaign_name || !offer) return error("campaign_name and offer are required", 400);

  const db = getDB(env);
  const { brand, context, brandName } = await fetchBrandCtx(db, auth.brand_id);

  const channelList = channels.length ? channels.join(", ") : "Facebook, Instagram, LinkedIn";

  const prompt = `You are a campaign strategist creating a complete launch asset set.

BRAND CONTEXT:
${context || `Brand: ${brandName}`}

CAMPAIGN: ${campaign_name}
OFFER: ${offer}
GOAL: ${goal || "increase awareness and drive conversions"}
CHANNELS: ${channelList}

Return ONLY this JSON:
{
  "campaign_summary": "2-sentence strategic overview",
  "social_posts": [
    { "platform": "platform", "post_type": "awareness", "body": "complete post text", "cta": "call to action", "hashtags": "#tag1 #tag2" },
    { "platform": "platform", "post_type": "consideration", "body": "complete post text", "cta": "call to action", "hashtags": "#tag1 #tag2" },
    { "platform": "platform", "post_type": "conversion", "body": "complete post text", "cta": "call to action", "hashtags": "#tag1 #tag2" }
  ],
  "article": {
    "title": "article headline",
    "intro": "2-paragraph introduction (complete text)",
    "cta": "article call to action"
  },
  "cta_variants": [
    { "channel": "channel", "cta": "specific CTA text" }
  ],
  "media_requirements": ["asset description 1", "asset description 2", "asset description 3"]
}

Rules:
- All body fields must be complete, publishable content — no [PLACEHOLDERS]
- Every post references the specific offer: ${offer}
- Respond with JSON only. No markdown.`;

  const result = await trackedRunLLM(env, {
    brand: brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "studio_campaign",
    options: { mode: "deep" },
  });

  if (!result) return error("Generation failed. Please try again.", 500);

  return json({
    campaign_name,
    campaign_summary: result.campaign_summary || "",
    social_posts: result.social_posts || [],
    article: result.article || null,
    cta_variants: result.cta_variants || [],
    media_requirements: result.media_requirements || [],
  });
}

// ── GET /api/customer/studio/vault ────────────────────────────────────────────
// Drafts saved from Studio
export async function getStudioVault(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT id, title, body, platforms, content_type, lifecycle_status, created_at, updated_at
    FROM content_vault
    WHERE brand_id = ? AND source = 'studio' AND lifecycle_status = 'draft'
    ORDER BY updated_at DESC LIMIT 50
  `).bind(auth.brand_id).all();

  return json({ data: results || [] });
}

// ── Fallback opportunities ────────────────────────────────────────────────────
function buildFallbackOpps(brandName, industry, platforms) {
  const pts = platforms.length ? platforms : ["instagram", "linkedin", "facebook"];
  const SEED = [
    { framework: "Myth vs Reality",    idea: `The biggest myth about ${industry}`,           hook: `Everyone in ${industry} believes this. They're wrong.`,     objective: "Build authority",         effort: "low",    media_type: "carousel"     },
    { framework: "Behind the Scenes",  idea: "What happens before we deliver results",         hook: "What clients never see before the final product.",         objective: "Build trust",             effort: "low",    media_type: "single_image" },
    { framework: "Mistakes to Avoid",  idea: `3 costly ${industry} mistakes`,                  hook: "Stop making these before they cost you.",                  objective: "Position as advisor",     effort: "low",    media_type: "carousel"     },
    { framework: "Customer Story",     idea: "Client transformation story",                    hook: "They came with one problem. We found another.",            objective: "Social proof",            effort: "medium", media_type: "single_image" },
    { framework: "Before & After",     idea: "Results we've delivered this quarter",           hook: "Before: reactive. After: strategic, growing.",             objective: "Show transformation",     effort: "medium", media_type: "carousel"     },
    { framework: "FAQ",                idea: "The question clients ask but pretend they don't", hook: "The question no one wants to ask out loud.",               objective: "Reduce friction",         effort: "low",    media_type: "text_only"    },
    { framework: "Stat + Commentary",  idea: "Industry number that changes decisions",         hook: "One number changed how we think about this entirely.",     objective: "Create urgency",          effort: "low",    media_type: "quote_card"   },
    { framework: "How-To",             idea: `How to achieve results faster in ${industry}`,   hook: "We cut our process to 3 steps. Here's exactly how.",      objective: "Demonstrate expertise",   effort: "medium", media_type: "carousel"     },
    { framework: "Opinion Take",       idea: `Unpopular opinion in ${industry}`,               hook: "Unpopular opinion: most advice in this space is wrong.",   objective: "Drive engagement",        effort: "low",    media_type: "text_only"    },
    { framework: "Trend Commentary",   idea: "What a current trend means for clients",         hook: "This shift is changing everything in our space.",          objective: "Thought leadership",      effort: "medium", media_type: "single_image" },
    { framework: "Case Study",         idea: "Deep dive on a successful client outcome",       hook: "Here's exactly how we solved a problem everyone ignores.", objective: "Build credibility",       effort: "high",   media_type: "carousel"     },
    { framework: "Team Story",         idea: "Person behind the work",                         hook: "Meet the person clients trust most with their results.",   objective: "Humanise brand",          effort: "medium", media_type: "single_image" },
    { framework: "Social Proof",       idea: "Collection of client results",                   hook: "5 outcomes our clients don't usually share publicly.",     objective: "Conversion",              effort: "medium", media_type: "carousel"     },
    { framework: "Question",           idea: "Polarising question for the audience",           hook: "Which of these is your biggest challenge right now?",     objective: "Engagement + research",   effort: "low",    media_type: "text_only"    },
    { framework: "Challenge",          idea: `7-day ${industry} improvement challenge`,        hook: "7 days. One action each day. Real results.",               objective: "Community building",      effort: "high",   media_type: "carousel"     },
    { framework: "Listicle",           idea: `10 signs you need help with ${industry}`,        hook: "You might not notice sign number 7.",                     objective: "Awareness and leads",     effort: "medium", media_type: "carousel"     },
    { framework: "Industry News",      idea: "What changed in your industry recently",         hook: "Something shifted this month. Most haven't noticed yet.",  objective: "Timeliness + authority",  effort: "low",    media_type: "text_only"    },
    { framework: "Product Feature",    idea: "Specific feature or service highlight",          hook: "One thing about our service clients underestimate most.",  objective: "Drive consideration",     effort: "medium", media_type: "single_image" },
    { framework: "Announcement",       idea: `${brandName} news or milestone`,                 hook: "Something worth sharing happened in our business.",        objective: "Brand visibility",        effort: "low",    media_type: "single_image" },
    { framework: "Seasonal",           idea: `Seasonal content for ${new Date().toLocaleString("en", { month: "long" })}`, hook: `This time of year, one thing matters more than the rest.`, objective: "Seasonal relevance", effort: "medium", media_type: "single_image" },
  ];

  return SEED.map((s, i) => ({
    id: i + 1,
    ...s,
    platforms: [pts[i % pts.length], pts[(i + 1) % pts.length]].filter(Boolean),
  }));
}
