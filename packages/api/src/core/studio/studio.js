// packages/api/src/core/studio/studio.js
// myPilotPost AI Content Studio — Generation Engine

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { trackedRunLLM } from "../ai/ai_client.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import { fetchBrandContext } from "../ai/brand_context.js";

// ── Brand context (wrapper for studio: adds active platforms) ─────────────────
async function fetchBrandCtx(db, brand_id) {
  const [dnaCtx, connections] = await Promise.all([
    fetchBrandContext(db, brand_id, 'standard'),
    db.prepare("SELECT platform FROM social_connections WHERE brand_id = ? AND status = 'active'").bind(brand_id).all(),
  ]);
  return {
    brand: dnaCtx.brand,
    context: dnaCtx.context,
    brandName: dnaCtx.brand?.name || "this brand",
    industry: dnaCtx.brand?.industry || "General",
    activePlatforms: (connections?.results || []).map(c => c.platform),
  };
}

// ── Strip HTML to plain text ──────────────────────────────────────────────────
function stripHTML(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── GET /api/customer/studio/opportunities ────────────────────────────────────
export async function getStudioOpportunities(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  await checkAndIncrement(db, auth.user_id, "ai");
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
    options: { mode: "deep", systemPromptType: "campaign" },
  });

  const opps = result?.opportunities;
  if (!opps?.length) {
    return json({ opportunities: buildFallbackOpps(brandName, industry, activePlatforms) });
  }

  return json({ opportunities: opps.slice(0, 20) });
}

// ── POST /api/customer/studio/generate-post ───────────────────────────────────
export async function generateStudioPost(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const { framework, idea, hook, platforms = [] } = body;
  if (!framework) return error("framework is required", 400);

  const db = getDB(env);
  await checkAndIncrement(db, auth.user_id, "ai");
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
    options: { mode: "deep", systemPromptType: "studio" },
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

// ── POST /api/customer/studio/scrape-website ──────────────────────────────────
export async function scrapeWebsite(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const { url } = body;
  if (!url) return error("url is required", 400);

  const db = getDB(env);
  await checkAndIncrement(db, auth.user_id, "ai");

  // Ensure URL has protocol
  const targetUrl = url.startsWith("http") ? url : `https://${url}`;

  // Fetch with timeout
  let rawText = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; myPilotPost/1.0; +https://mypilotpost.com)" },
    });
    clearTimeout(timeout);
    const html = await res.text();
    rawText = stripHTML(html).slice(0, 4000);
  } catch (e) {
    return json({
      success: false,
      brandContext: null,
      error: `Could not fetch ${targetUrl}: ${e.message}`,
    });
  }

  if (!rawText || rawText.length < 50) {
    return json({ success: false, brandContext: null, error: "Page returned insufficient content." });
  }

  const { brand } = await fetchBrandCtx(db, auth.brand_id);

  const prompt = `You are extracting business context from website content.

WEBSITE TEXT (from ${targetUrl}):
${rawText}

Extract and return ONLY this JSON:
{
  "business_name": "company name",
  "tagline": "brand tagline or value prop",
  "services": ["service 1", "service 2"],
  "products": ["product 1", "product 2"],
  "pricing": ["pricing info if found"],
  "target_audience": "who this is for",
  "value_proposition": "core offer or promise",
  "key_messages": ["message 1", "message 2", "message 3"],
  "testimonials": ["testimonial snippet 1"],
  "tone": "formal/casual/friendly/authoritative",
  "content_topics": ["topic 1", "topic 2", "topic 3", "topic 4", "topic 5"]
}

Rules:
- Only extract what is actually present — do not invent
- If a field is empty, use []
- Respond with JSON only. No markdown.`;

  const result = await trackedRunLLM(env, {
    brand: brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "studio_website_scrape",
    options: { mode: "fast" },
  });

  if (!result) {
    return json({ success: false, brandContext: null, error: "Extraction failed. Try again." });
  }

  return json({
    success: true,
    url: targetUrl,
    brandContext: result,
  });
}

// ── POST /api/customer/studio/playbook ────────────────────────────────────────
export async function runPlaybook(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const { playbook_type, industry: reqIndustry, input_data, intensity = "medium", channels = [], website_context } = body;
  if (!playbook_type) return error("playbook_type is required", 400);

  const db = getDB(env);
  await checkAndIncrement(db, auth.user_id, "ai");
  const { brand, context, brandName, industry } = await fetchBrandCtx(db, auth.brand_id);

  const targetIndustry = reqIndustry || industry;
  const cardCount = intensity === "low" ? 6 : intensity === "high" ? 12 : 8;
  const channelList = channels.length ? channels.join(", ") : "Facebook, Instagram, LinkedIn";

  const inputSummary = typeof input_data === "string"
    ? input_data
    : JSON.stringify(input_data || {}, null, 2);

  const websiteSummary = website_context
    ? `\nWEBSITE CONTEXT:\n${JSON.stringify(website_context, null, 2)}`
    : "";

  const prompt = `You are a senior content strategist executing a ${playbook_type} playbook.

BRAND CONTEXT:
${context || `Brand: ${brandName}\nIndustry: ${targetIndustry}`}

PLAYBOOK: ${playbook_type}
INDUSTRY: ${targetIndustry}
CHANNELS: ${channelList}
${websiteSummary}

BRAND/PRODUCT DATA:
${inputSummary}

Generate exactly ${cardCount} content cards for this playbook. Return ONLY this JSON:
{
  "summary": "2-sentence plan overview specific to this brand",
  "cards": [
    {
      "title": "specific post title for this brand",
      "content_type": "social",
      "platform": "primary platform",
      "platforms": ["platform1", "platform2"],
      "caption": "complete, ready-to-publish post — 80-220 words, no placeholders",
      "hook": "scroll-stopping opening line — max 12 words",
      "cta": "specific call to action",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "format": "single_image",
      "timing": "best day/time to post"
    }
  ],
  "schedule_suggestion": "1-sentence scheduling recommendation"
}

Rules:
- Every caption must be complete and publishable — no [PLACEHOLDERS], no templates
- Reference the brand and industry data above directly in each caption
- Mix formats: single_image, carousel, video, text_only
- Vary platforms across cards
- Respond with JSON only. No markdown.`;

  const result = await trackedRunLLM(env, {
    brand: brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "studio_playbook",
    options: { mode: "deep", systemPromptType: "campaign" },
  });

  if (!result) return error("Generation failed. Please try again.", 500);

  const cards = (result.cards || []).slice(0, cardCount).map((c, i) => ({
    id: `pb_${i}`,
    title: c.title || `${playbook_type} Post ${i + 1}`,
    content_type: c.content_type || "social",
    platform: c.platform || "instagram",
    platforms: Array.isArray(c.platforms) ? c.platforms : [c.platform || "instagram"],
    caption: c.caption || c.body || "",
    hook: c.hook || "",
    cta: c.cta || "",
    hashtags: Array.isArray(c.hashtags) ? c.hashtags : [],
    format: c.format || "single_image",
    timing: c.timing || "",
    source: "playbook",
    playbook_type,
  }));

  return json({
    playbook_type,
    intensity,
    summary: result.summary || `${playbook_type} content plan for ${brandName}.`,
    cards,
    schedule_suggestion: result.schedule_suggestion || "",
  });
}

// ── POST /api/customer/studio/campaign ────────────────────────────────────────
export async function generateCampaignContent(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const { campaign_name, offer, goal, channels = [], campaign_id } = body;
  if (!campaign_name || !offer) return error("campaign_name and offer are required", 400);

  const db = getDB(env);
  await checkAndIncrement(db, auth.user_id, "ai");
  const { brand, context, brandName } = await fetchBrandCtx(db, auth.brand_id);
  const channelList = channels.length ? channels.join(", ") : "Facebook, Instagram, LinkedIn";

  const prompt = `You are a campaign strategist creating a complete launch asset set as visual content cards.

BRAND CONTEXT:
${context || `Brand: ${brandName}`}

CAMPAIGN: ${campaign_name}
OFFER: ${offer}
GOAL: ${goal || "increase awareness and drive conversions"}
CHANNELS: ${channelList}

Generate a set of campaign content cards. Return ONLY this JSON:
{
  "campaign_summary": "2-sentence strategic overview",
  "cards": [
    {
      "title": "card title",
      "post_type": "awareness",
      "platform": "instagram",
      "platforms": ["instagram", "facebook"],
      "caption": "complete, ready-to-publish post about ${offer} — no placeholders",
      "hook": "scroll-stopping opening line",
      "cta": "specific call to action",
      "hashtags": ["#tag1", "#tag2"],
      "format": "single_image"
    }
  ],
  "article": {
    "title": "article headline",
    "intro": "2-paragraph introduction (complete text)",
    "cta": "article call to action"
  }
}

Include exactly 4-6 social cards covering: awareness, consideration, conversion, social proof.
Rules:
- Every caption must reference the specific offer: ${offer}
- No [PLACEHOLDER] text anywhere
- Respond with JSON only. No markdown.`;

  const result = await trackedRunLLM(env, {
    brand: brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id || null,
    content_type: "studio_campaign",
    options: { mode: "deep", systemPromptType: "campaign" },
  });

  if (!result) return error("Generation failed. Please try again.", 500);

  const cards = (result.cards || []).slice(0, 6).map((c, i) => ({
    id: `camp_${i}`,
    title: c.title || `${campaign_name} — ${c.post_type || "Post"} ${i + 1}`,
    content_type: "social",
    platform: c.platform || "instagram",
    platforms: Array.isArray(c.platforms) ? c.platforms : [c.platform || "instagram"],
    caption: c.caption || "",
    hook: c.hook || "",
    cta: c.cta || "",
    hashtags: Array.isArray(c.hashtags) ? c.hashtags : [],
    format: c.format || "single_image",
    post_type: c.post_type || "",
    source: "campaign",
    campaign_name,
    campaign_id: campaign_id || null,
  }));

  return json({
    campaign_name,
    campaign_summary: result.campaign_summary || "",
    cards,
    article: result.article || null,
  });
}

// ── GET /api/customer/studio/vault ────────────────────────────────────────────
export async function getStudioVault(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT id, title, body, hook, cta, hashtags, platforms, content_type, lifecycle_status, metadata, created_at, updated_at
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
