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
    fetchBrandContext(db, brand_id, 'full'),
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
      "caption": "complete, ready-to-publish post — 80-220 words, no placeholders, structured as requested below",
      "cta": "specific call to action",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "objective": "one short goal: build trust / generate leads / etc.",
      "platforms": ["platform1", "platform2"],
      "media_type": "text_only",
      "effort": "low"
    }
  ]
}

Format Rules for the "caption" field depending on the "media_type" or platform:
- If media_type is "short_video" (Reel, Story, TikTok): Format as a visual script. Example:
  [SCENE 1: Visual detail]
  Overlay: "Hook..."
  Voiceover: "Voiceover script..."
  [SCENE 2: Visual detail]
  Voiceover: "Substance..."
- If media_type/platforms indicates an Instagram Story: Format as a 3-slide sequence with text and layouts.
- If platforms contains "blog": Format as a structured article draft with clear sections.
- For standard feed posts: Format with a clear "HOOK", "STORY/VALUE", "CALL TO ACTION", and "HASHTAGS". Seamlessly incorporate the website URL from the BRAND CONTEXT if present.

Rules:
- Generate 20 items.
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

  const prompt = `You are an expert copywriter generating a complete content post or script.

BRAND CONTEXT:
${context || `Brand: ${brandName}`}

FRAMEWORK: ${framework}
CONCEPT: ${idea || ""}
HOOK: ${hook || ""}
PLATFORMS: ${platformList}

Write the complete post. Return ONLY this JSON:
{
  "body": "complete post text ready to use — formatted as requested",
  "hook": "refined scroll-stopping opening line",
  "cta": "specific call to action",
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5",
  "platform_variants": {
    "instagram": "instagram-specific variant if different",
    "linkedin": "linkedin-specific variant if different"
  }
}

Format Rules for the "body" field depending on the format type:
- If format/platform indicates a Reel, Story, or TikTok: Format as a visual script. Example:
  [SCENE 1: Visual detail]
  Overlay: "Hook..."
  Voiceover/Audio: "Script..."
  [SCENE 2: Visual detail]
  Voiceover/Audio: "Value..."
- If it is a Story: Format as a slide-by-slide sequence (e.g. Slide 1, Slide 2, Slide 3).
- If it is a Blog post or Article: Format as a complete structured article draft with clear headings.
- For standard feed posts: Format with a clear Hook, Story/Value details, a direct Call to Action, and Hashtags. Seamlessly incorporate the website URL from the BRAND CONTEXT if present.

Rules:
- Write the actual post, not a description of what to write.
- No [PLACEHOLDER] text — it must be complete and publishable.
- No generic openers.
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
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    };
    let res;
    try {
      res = await fetch(targetUrl, {
        signal: controller.signal,
        headers,
      });
    } catch (fetchErr) {
      if (targetUrl.startsWith('https://')) {
        const httpUrl = targetUrl.replace('https://', 'http://');
        res = await fetch(httpUrl, {
          signal: controller.signal,
          headers,
        });
      } else {
        throw fetchErr;
      }
    }
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
      "caption": "complete, ready-to-publish post — formatted as requested",
      "hook": "scroll-stopping opening line — max 12 words",
      "cta": "specific call to action",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "format": "single_image",
      "timing": "best day/time to post"
    }
  ],
  "schedule_suggestion": "1-sentence scheduling recommendation"
}

Format Rules for the "caption" field depending on the format type:
- If format is "short_video" (Reel, Story, TikTok): Format as a visual script. Example:
  [SCENE 1: Describe visual]
  Text Overlay: "Hook text"
  Voiceover: "Voiceover text"
  [SCENE 2: Describe visual]
  Voiceover: "Value proposition..."
- If format is "story" (Instagram/Facebook Story): Format as a 3-slide sequence with visual ideas and text.
- If format is "article" or content_type is "blog": Format as a structured article layout with an Introduction, Headings, and a Conclusion.
- For standard feed posts (Social Media Post): Format with a clear "HOOK" (scroll-stopping line), followed by "STORY/VALUE" (the core message), a direct "CALL TO ACTION" (cta), and then "HASHTAGS". If a website URL exists in the BRAND CONTEXT, seamlessly include it in the call to action where appropriate.

General Rules:
- Every caption must be complete and publishable — no [PLACEHOLDERS], no templates.
- Reference the brand and industry data above directly in each caption.
- Mix formats: single_image, carousel, short_video, story, text_only.
- Vary platforms across cards.
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
    {
      framework: "Myth vs Reality",
      idea: `The biggest myth about ${industry}`,
      hook: `Everyone in ${industry} believes this. They're wrong.`,
      objective: "Build authority",
      effort: "low",
      media_type: "carousel",
      caption: `HOOK: Everyone in ${industry} believes that success happens overnight. They're wrong.\n\nSTORY: True growth takes strategy, consistency, and a deep understanding of your data. We design roadmaps that don't rely on luck.\n\nCTA: Ready to see your real roadmap? Visit us at [website] and get started today.\n\n#${industry.replace(/\s+/g, '')} #businessgrowth #strategy`
    },
    {
      framework: "Behind the Scenes",
      idea: "What happens before we deliver results",
      hook: "What clients never see before the final product.",
      objective: "Build trust",
      effort: "low",
      media_type: "single_image",
      caption: `HOOK: What clients never see before the final product is delivered.\n\nSTORY: Behind every successful campaign is hours of deep research, auditing, and visual context refinement. We build with care.\n\nCTA: Let's build your brand together. Link in bio to learn more at [website].\n\n#behindthescenes #workculture #agencylife`
    },
    {
      framework: "Mistakes to Avoid",
      idea: `3 costly ${industry} mistakes`,
      hook: "Stop making these before they cost you.",
      objective: "Position as advisor",
      effort: "low",
      media_type: "carousel",
      caption: `HOOK: Stop making these 3 costly ${industry} mistakes before they cost you your growth.\n\nSTORY: 1. Ignoring visual context.\n2. Lacking clear CTAs.\n3. Skipping target audience checks. Avoid these to scale cleanly.\n\nCTA: Read the full breakdown on our website: [website].\n\n#mistakestoavoid #industrytips #growth`
    },
    {
      framework: "Customer Story",
      idea: "Client transformation story",
      hook: "They came with one problem. We found another.",
      objective: "Social proof",
      effort: "medium",
      media_type: "single_image",
      caption: `HOOK: They came to us with one minor problem. We uncovered a massive hidden bottleneck.\n\nSTORY: By realigning their brand DNA and mapping out a structured campaign, we turned a degraded workflow into an operational powerhouse.\n\nCTA: See more client success stories at [website].\n\n#casestudy #clientsuccess #results`
    },
    {
      framework: "Before & After",
      idea: "Results we've delivered this quarter",
      hook: "Before: reactive. After: strategic, growing.",
      objective: "Show transformation",
      effort: "medium",
      media_type: "carousel",
      caption: `HOOK: Before: reactive and chaotic. After: strategic, consistent, and growing.\n\nSTORY: Our quarterly audit showed a 150% boost in audience alignment. Consistency is key when you have the right playbook.\n\nCTA: Calculate your potential growth at [website] now.\n\n#transformation #beforeandafter #metrics`
    },
    {
      framework: "FAQ",
      idea: "The question clients ask but pretend they don't",
      hook: "The question no one wants to ask out loud.",
      objective: "Reduce friction",
      effort: "low",
      media_type: "text_only",
      caption: `HOOK: The one question about ${industry} no one wants to ask out loud.\n\nSTORY: Yes, it takes commitment. But starting with simple templates makes the onboarding process painless and fast.\n\nCTA: Find answers to all your burning questions at [website]/faq.\n\n#faq #askusanything #knowledgeshare`
    },
    {
      framework: "Stat + Commentary",
      idea: "Industry number that changes decisions",
      hook: "One number changed how we think about this entirely.",
      objective: "Create urgency",
      effort: "low",
      media_type: "quote_card",
      caption: `HOOK: One single number changed how we think about this space entirely.\n\nSTORY: Over 70% of brands fail to align their visual style with their target audience. Fixing this one signal changes everything.\n\nCTA: Let's audit your alignment score today. Learn how: [website].\n\n#statistics #datadriven #insights`
    },
    {
      framework: "How-To",
      idea: `How to achieve results faster in ${industry}`,
      hook: "We cut our process to 3 steps. Here's exactly how.",
      objective: "Demonstrate expertise",
      effort: "medium",
      media_type: "carousel",
      caption: `HOOK: We cut our entire process down to just 3 simple steps. Here's exactly how we did it.\n\nSTORY: 1. Setup a website URL link.\n2. Fetch raw assets.\n3. Flatten overlays. Clean, fast, and highly repeatable.\n\nCTA: Download the free playbook checklist at [website]/guide.\n\n#howto #tutorial #stepbystep`
    },
    {
      framework: "Opinion Take",
      idea: `Unpopular opinion in ${industry}`,
      hook: "Unpopular opinion: most advice in this space is wrong.",
      objective: "Drive engagement",
      effort: "low",
      media_type: "text_only",
      caption: `HOOK: Unpopular opinion: most generic advice in this space is actually setting you back.\n\nSTORY: You don't need a massive team; you need high-fidelity brand DNA context and automation to do the heavy lifting.\n\nCTA: Agree or disagree? Let us know at [website].\n\n#opinion #contrarian #thought`
    },
    {
      framework: "Trend Commentary",
      idea: "What a current trend means for clients",
      hook: "This shift is changing everything in our space.",
      objective: "Thought leadership",
      effort: "medium",
      media_type: "single_image",
      caption: `HOOK: This new shift is changing everything in our space. Are you prepared?\n\nSTORY: Traditional static image pools are being replaced by format-aware, structured visual brief generators. Stay ahead or get left behind.\n\nCTA: Read our latest trend report at [website]/news.\n\n#trends #industrynews #future`
    },
    {
      framework: "Case Study",
      idea: "Deep dive on a successful client outcome",
      hook: "Here's exactly how we solved a problem everyone ignores.",
      objective: "Build credibility",
      effort: "high",
      media_type: "carousel",
      caption: `HOOK: Here's exactly how we solved a visual mismatch problem that most brands ignore.\n\nSTORY: By integrating dynamic overlays and custom CTA buttons directly into their feed, we boosted their conversion rates by 40%.\n\nCTA: View the full case study deck at [website]/case-studies.\n\n#casestudy #marketingtips #conversion`
    },
    {
      framework: "Team Story",
      idea: "Person behind the work",
      hook: "Meet the person clients trust most with their results.",
      objective: "Humanise brand",
      effort: "medium",
      media_type: "single_image",
      caption: `HOOK: Meet the core strategist that our clients trust most with their campaign results.\n\nSTORY: We believe in human-centric solutions. Our team spends every day mapping signals to make sure your visuals stand out.\n\nCTA: Get to know our team and our values at [website]/about.\n\n#team #meettheteam #companyculture`
    },
    {
      framework: "Social Proof",
      idea: "Collection of client results",
      hook: "5 outcomes our clients don't usually share publicly.",
      objective: "Conversion",
      effort: "medium",
      media_type: "carousel",
      caption: `HOOK: 5 outstanding outcomes our clients don't usually share publicly.\n\nSTORY: From 10% onboarding completion to 95% within the first month. These numbers speak for themselves. We deliver real results.\n\nCTA: Let us help you achieve similar outcomes. Apply today: [website].\n\n#socialproof #testimonials #reviews`
    },
    {
      framework: "Question",
      idea: "Polarising question for the audience",
      hook: "Which of these is your biggest challenge right now?",
      objective: "Engagement + research",
      effort: "low",
      media_type: "text_only",
      caption: `HOOK: What is holding your brand back from achieving the ultimate alignment score?\n\nSTORY: Is it lack of clear brand DNA, missing website URL mapping, or duplicate visual suggestions? Tell us in the comments.\n\nCTA: Connect with us and let's find the solution: [website].\n\n#feedback #polls #engagement`
    },
    {
      framework: "Challenge",
      idea: `7-day ${industry} improvement challenge`,
      hook: "7 days. One action each day. Real results.",
      objective: "Community building",
      effort: "high",
      media_type: "carousel",
      caption: `HOOK: 7 days. One simple daily action. Real, measurable results.\n\nSTORY: We are hosting a brand DNA design challenge starting this Monday. No fluff, just pure strategic execution to revamp your social feed.\n\nCTA: Join the challenge community for free at [website]/challenge.\n\n#challenge #7daychallenge #learning`
    },
    {
      framework: "Listicle",
      idea: `10 signs you need help with ${industry}`,
      hook: "You might not notice sign number 7.",
      objective: "Awareness and leads",
      effort: "medium",
      media_type: "carousel",
      caption: `HOOK: 10 warning signs that you need professional help with your brand positioning.\n\nSTORY: You might not notice sign number 7—it's having a dry, uninspiring stock photo feed with no brand overlays.\n\nCTA: Check out all 10 signs on our blog: [website]/blog.\n\n#listicle #businessadvice #tips`
    },
    {
      framework: "Industry News",
      idea: "What changed in your industry recently",
      hook: "Something shifted this month. Most haven't noticed yet.",
      objective: "Timeliness + authority",
      effort: "low",
      media_type: "text_only",
      caption: `HOOK: Something massive shifted in our industry this month. Most brands haven't noticed yet.\n\nSTORY: Edge worker visual assets are now fully customizable dynamically. This levels the playing field for small teams.\n\nCTA: Stay ahead of the curve. Learn more at [website]/updates.\n\n#news #industrytrends #updates`
    },
    {
      framework: "Product Feature",
      idea: "Specific feature or service highlight",
      hook: "One thing about our service clients underestimate most.",
      objective: "Drive consideration",
      effort: "medium",
      media_type: "single_image",
      caption: `HOOK: The one advanced feature about our platform that clients underestimate the most.\n\nSTORY: It's our dynamic brand overlay editor. It places styled hooks and watermark logos instantly, saving hours of manual editing.\n\nCTA: Test the tool yourself today at [website]/features.\n\n#product #features #saastool`
    },
    {
      framework: "Announcement",
      idea: `${brandName} news or milestone`,
      hook: "Something worth sharing happened in our business.",
      objective: "Brand visibility",
      effort: "low",
      media_type: "single_image",
      caption: `HOOK: Something absolutely worth sharing just happened in our business today.\n\nSTORY: We have hit our target version release! This update introduces better media intelligence deduplication and format layouts.\n\nCTA: Read the release notes at [website]/changelog.\n\n#milestone #announcement #news`
    },
    {
      framework: "Seasonal",
      idea: `Seasonal content for ${new Date().toLocaleString("en", { month: "long" })}`,
      hook: `This time of year, one thing matters more than the rest.`,
      objective: "Seasonal relevance",
      effort: "medium",
      media_type: "single_image",
      caption: `HOOK: At this time of the year, one strategic focus matters more than all the rest combined.\n\nSTORY: As we enter the next season, auditing your content structure ensures your growth targets remain fully on track.\n\nCTA: Schedule a strategy review with us at [website]/contact.\n\n#seasonal #strategy #q3`
    }
  ];

  return SEED.map((s, i) => ({
    id: i + 1,
    ...s,
    platforms: [pts[i % pts.length], pts[(i + 1) % pts.length]].filter(Boolean),
  }));
}
