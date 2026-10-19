// packages/api/src/core/studio/studio.js
// myPilotPost AI Content Studio — Generation Engine

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { kvGetJSON, kvPutJSON, kvDel } from "../../lib/kvcache.js";
import { trackedRunLLM } from "../ai/ai_client.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import { fetchBrandContext } from "../ai/brand_context.js";
import { getCertifiedTemplate, requireCertifiedTemplate } from "../templates/registry.js";
import { assignCertifiedTemplates, selectCertifiedTemplate, capacityFor, formatForCard } from "../templates/select.js";
import { generateBrief } from "../media/brief.js";
import { fetchPexels } from "../media/providers/pexels.js";
import { searchAndRankMedia } from "../media/feedMedia.js";
import { rankMediaForSlot } from "../templates/mediaMatch.js";

// Read visual identity resiliently across the migration-153/155 window.
// Prefer the canonical columns (primary_color_hex, migration 153) — the same source
// resolveBrandBindings uses — and fall back to the legacy columns for any DB where
// migration 155 hasn't dropped them yet (prod is currently in this partial state).
// A single SQLite query can't reference a missing column, so we try/catch two shapes.
async function fetchVisualRow(db, brand_id) {
  try {
    return await db.prepare(
      "SELECT primary_color_hex AS primary_color, secondary_color_hex AS secondary_color, font_pairing_body AS typography_main FROM brand_dna_visual_identity WHERE brand_id = ?"
    ).bind(brand_id).first();
  } catch {
    try {
      return await db.prepare(
        "SELECT primary_color, secondary_color, typography_main FROM brand_dna_visual_identity WHERE brand_id = ?"
      ).bind(brand_id).first();
    } catch (e) {
      console.warn("[STUDIO] fetchVisualRow failed for both column shapes:", e?.message);
      return null;
    }
  }
}

// ── Brand context (wrapper for studio: adds active platforms) ─────────────────
async function fetchBrandCtx(db, brand_id) {
  const [dnaCtx, connections, brandRow, visualRow] = await Promise.all([
    fetchBrandContext(db, brand_id, 'full'),
    db.prepare("SELECT platform FROM social_connections WHERE brand_id = ? AND status = 'active'").bind(brand_id).all(),
    db.prepare("SELECT logo_url FROM brands WHERE id = ?").bind(brand_id).first(),
    fetchVisualRow(db, brand_id),
  ]);
  return {
    brand: dnaCtx.brand,
    context: dnaCtx.context,
    brandName: dnaCtx.brand?.name || "this brand",
    industry: dnaCtx.brand?.industry || "General",
    activePlatforms: (connections?.results || []).map(c => c.platform),
    visuals: {
      primary_color: visualRow?.primary_color || "#1A1A1A",
      secondary_color: visualRow?.secondary_color || "#F5F5F5",
      font_stack: visualRow?.typography_main || "Inter, sans-serif",
      logo_url: brandRow?.logo_url || "https://mypilotpost.com/assets/logo.png"
    }
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

// Simple string hash function for cache indexing
function getHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

// Helper to resolve card hero image, render thumbnail, upload, and cache in KV
async function processCardThumbnail(card, suggestedTemplateId, visuals, auth, env) {
  const cardHash = getHash(`${card.idea || ''}:${card.framework || ''}:${suggestedTemplateId}:${visuals.primary_color || ''}:${visuals.logo_url || ''}`);
  const cacheKey = `studio_thumb:${auth.brand_id}:${cardHash}`;

  // 1. Try KV cache
  const cachedThumb = await kvGetJSON(env.STUDIO_CACHE_KV, cacheKey);
  if (cachedThumb) return cachedThumb;

  // 2. Fetch hero image (lightweight)
  let imageUrl = null;
  const firstPlatform = Array.isArray(card.platforms) && card.platforms.length > 0
    ? card.platforms[0]
    : "instagram";
  const format = suggestedTemplateId.includes("carousel") ? "carousel" : "feed_post";

  try {
    const brief = generateBrief({
      platform: firstPlatform,
      contentType: 'social',
      format,
      text: card.caption || card.idea || '',
      title: card.idea || '',
      brand: visuals.brandName || '',
      industry: visuals.industry || '',
      goal: card.objective || ''
    });

    const photos = await fetchPexels({
      query: brief.query,
      orientation: brief.orientation === 'portrait' ? 'portrait' : 'landscape',
      limit: 1
    }, env);

    if (photos && photos.length > 0) {
      imageUrl = photos[0].url || photos[0].preview || null;
    }
  } catch (err) {
    console.warn("[STUDIO THUMBNAIL] Media fetch failed for card:", card.id, err.message);
  }

  // 3. Generate Thumbnail and upload to R2
  let cdnUrl = "";
  try {
    const templateSchema = getCertifiedTemplate(suggestedTemplateId);
    if (!templateSchema) {
      throw new Error(`TEMPLATE_NOT_CERTIFIED: ${suggestedTemplateId}`);
    }
    const first60Chars = (card.hook || card.idea || "").slice(0, 60);
    const { renderTemplateFlat } = await import("../templates/renderer.js");
    const finalBuffer = await renderTemplateFlat(
      templateSchema.id,
      { headline: first60Chars, image: imageUrl || "" },
      auth.brand_id,
      env,
    );
    const extension = "png";
    const contentType = "image/png";

    if (env.MEDIA_BUCKET) {
      const r2Key = `opportunities/${auth.brand_id}/${cardHash}.${extension}`;
      await env.MEDIA_BUCKET.put(r2Key, finalBuffer, {
        httpMetadata: { contentType }
      });
      cdnUrl = `${env.BASE_URL || "https://api.mypilotpost.com"}/api/media/file/${r2Key}`;
    }
  } catch (err) {
    console.error("[STUDIO THUMBNAIL] Render/Upload failed for card:", card.id, err.message);
  }

  const result = { thumbnailUrl: cdnUrl || null, heroImageUrl: imageUrl || null };

  // 4. Save to KV cache (24-hour TTL)
  if (cdnUrl) {
    await kvPutJSON(env.STUDIO_CACHE_KV, cacheKey, result, 24 * 60 * 60);
  }

  return result;
}

// ── GET /api/customer/studio/opportunities ────────────────────────────────────
// Invalidate a brand's cached Discover feed (and its prewarm day-marker) so the next
// open regenerates from CURRENT Brand DNA instead of serving content generated before
// the update. The feed cache key is studio_feed_{brand}_{YYYY-MM-DD} (brand+day only,
// no DNA factor), so without this a mid-day DNA edit stays stale until the date rolls
// over. No-op when STUDIO_CACHE_KV isn't bound. Covers a ±1 day window for UTC/local
// date-boundary safety. Cached template PNGs in R2 are NOT touched — they are
// content-hashed and regenerate naturally once new content exists.
export async function invalidateStudioFeedCache(env, brand_id) {
  if (!env?.STUDIO_CACHE_KV || !brand_id) return;
  const now = Date.now();
  const keys = [];
  for (let d = -1; d <= 1; d++) {
    const day = new Date(now + d * 86400000).toISOString().split("T")[0];
    keys.push(`studio_feed_${brand_id}_${day}`);
    keys.push(`studio_prewarm_done_${brand_id}_${day}`);
  }
  await Promise.all(keys.map((k) => kvDel(env.STUDIO_CACHE_KV, k)));
  console.log(`[STUDIO] Invalidated Discover feed cache for brand ${brand_id} (${keys.length} keys)`);
}

// ── GET /api/customer/studio/opportunities ────────────────────────────────────
export async function getStudioOpportunities(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  
  // 1. Check KV cache first (24-hour TTL, key: studio_feed_{brand_id}_{YYYY-MM-DD})
  const todayStr = new Date().toISOString().split("T")[0];
  const feedKey = `studio_feed_${auth.brand_id}_${todayStr}`;
  const cached = await kvGetJSON(env.STUDIO_CACHE_KV, feedKey);
  if (cached && Array.isArray(cached.opportunities) && cached.opportunities.length > 0) {
    console.log(`[STUDIO INFO] KV cache hit for key: ${feedKey}`);
    return json(cached);
  }

  await checkAndIncrement(db, auth.user_id, "ai");
  const { brand, context, brandName, industry, activePlatforms, visuals } = await fetchBrandCtx(db, auth.brand_id);
  const platforms = activePlatforms.length ? activePlatforms.join(", ") : "Facebook, Instagram, LinkedIn";
  const month = new Date().toLocaleString("en", { month: "long" });

  // Query preferred template ID from brand_memory
  const preferredTemplateRow = await db.prepare(`
    SELECT preferred_template_id FROM brand_memory
    WHERE brand_id = ? AND preferred_template_id IS NOT NULL
    LIMIT 1
  `).bind(auth.brand_id).first();
  const preferredTemplateId = preferredTemplateRow?.preferred_template_id || null;

  const prompt = `You are a content strategist creating a daily content opportunity briefing.

BRAND CONTEXT:
${context || `Brand: ${brandName}\nIndustry: ${industry}`}

ACTIVE PLATFORMS: ${platforms}
CURRENT MONTH: ${month}

Generate exactly 8 specific content opportunities for ${brandName}. Each must be grounded in this brand, not generic.

Return ONLY this JSON object:
{
  "opportunities": [
    {
      "id": 1,
      "framework": "Myth vs Reality",
      "idea": "specific post concept for this brand",
      "hook": "scroll-stopping opening line — max 12 words, never generic",
      "caption": "a 1-2 sentence preview of the post concept — punchy, no placeholders (max 200 chars). The full post is written later when the user picks this idea.",
      "headline": "the exact headline TEXT printed on the graphic — finished, punchy, specific copy the viewer reads (max 60 chars)",
      "body": "the exact body copy printed on the graphic — a finished sentence the viewer reads, NOT a description of the post (max 120 chars)",
      "cta_text": "CTA button text (max 30 chars)",
      "cta": "specific call to action link target/description",
      "visual_query": "a short, concrete description of the ideal PHOTO for this post — the literal subject a stock-photo search should find, grounded in ${brandName}'s actual business/industry, NOT the headline words. e.g. for a moving company: 'movers carrying boxes into a truck', 'family unpacking in a new home'. 3-8 words, real physical scene, never abstract concepts or wordplay (max 80 chars)",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "objective": "one short goal: build trust / generate leads / etc.",
      "platforms": ["platform1", "platform2"],
      "media_type": "text_only",
      "effort": "low"
    }
  ]
}

"caption" is only a SHORT preview at this stage (see its char cap) — do NOT write the
full post, script, or hashtag block here. The complete, format-specific post is generated
later when the user selects an idea.

Rules:
- Generate exactly 8 items.
- Use these frameworks (no repeats): Myth vs Reality, Behind the Scenes, Mistakes to Avoid, Before & After, Customer Story, FAQ, Stat + Commentary, How-To, Opinion Take, Trend Commentary, Case Study, Product Feature, Team Story, Industry News, Social Proof, Challenge, Listicle, Question, Announcement, Seasonal
- platforms must be from: ${platforms}
- effort values: low, medium, high  — distribute ~3/3/2
- media_type values: text_only, single_image, carousel, short_video, quote_card
- hooks must be surprising, specific, contrarian — never "Are you ready?" or "Did you know?"
- CRITICAL: "headline", "body" and "cta_text" are the LITERAL words rendered on the graphic. Write finished, ready-to-publish copy only — never a description or instruction about the post. Never begin these fields with words like "Explain", "Show", "Highlight", "Describe", "Debunk", "Discuss", "A quick look at", or "Learn about". Write what the viewer actually reads.
- CRITICAL: "visual_query" must be a concrete, photographable SCENE from ${brandName}'s real industry (${industry}) — the literal subject a photographer would shoot. NEVER derive it from the headline's abstract words (myth, mistake, transform, error) and NEVER use wordplay, letters, signs, or text-in-image concepts. It is the search phrase that finds the right real-world photo.
- Respond with valid JSON only. No markdown.`;

  if (!env.GROQ_API_KEY) {
    console.error("[STUDIO ERROR] GROQ_API_KEY is missing in the worker environment! Local Dev/Workers will use stubs or emergency fallbacks.");
  }

  let result = null;
  try {
    result = await trackedRunLLM(env, {
      brand: brand || {},
      prompt,
      brand_id: auth.brand_id,
      user_id: auth.user_id || null,
      content_type: "studio_opportunities",
      // Ask for 10 (not 20): a 20-item request always overran the 6000-token completion
      // cap and got salvaged by recoverStructured() as a truncated 'partial-recovery'
      // (yielding a variable 3-15 items). 10 full-richness objects fit well inside 6000
      // completion tokens, so the JSON completes untruncated. 8000 got 413'd (TPM ceiling),
      // so 6000 stays. recoverStructured() remains a safety net, but should no longer fire.
      options: { mode: "deep", systemPromptType: "campaign", maxTokens: 6000, timeoutMs: 30000 },
    });
  } catch (err) {
    console.error("[STUDIO ERROR] LLM prompt execution encountered an error:", err.message, err.stack);
  }

  const rawOpps = Array.isArray(result?.opportunities) ? result.opportunities : [];

  // Positioning is "agency-level, ready to post". A card is only surfaced if real
  // generation produced real content for it. We NEVER pad the feed with hardcoded
  // placeholder text — a card that failed to generate is dropped, not faked.
  const PLACEHOLDER_MARKERS = [
    "fallback generated post",
    "update your brand dna to personalize",
    "your dynamic quote text",
    "your headline",
    "lorem ipsum"
  ];
  const isReadyToPost = (opp) => {
    const headline = String(opp?.headline || opp?.hook || opp?.idea || "").trim();
    const body = String(opp?.body || opp?.caption || "").trim();
    const cta = String(opp?.cta_text || opp?.cta || "").trim();
    if (!headline || !body || !cta) return false;
    const blob = `${headline} ${body} ${cta}`.toLowerCase();
    return !PLACEHOLDER_MARKERS.some((m) => blob.includes(m));
  };

  const opps = [];
  let skipped = 0;
  rawOpps.forEach((opp, i) => {
    if (isReadyToPost(opp)) {
      opps.push(opp);
    } else {
      skipped++;
      console.warn(`[STUDIO] Dropping opportunity ${opp?.id ?? i + 1} for brand ${auth.brand_id}: generation produced empty/placeholder content — not surfacing as a ready idea.`);
    }
  });

  if (opps.length === 0) {
    console.error(`[STUDIO] No confident opportunities for brand ${auth.brand_id} (${result ? `LLM returned ${rawOpps.length}, all dropped` : "LLM call failed"}). Returning empty feed rather than placeholders.`);
    // Short TTL (15 min) so the next open can retry generation rather than being stuck on an empty day.
    await kvPutJSON(env.STUDIO_CACHE_KV, feedKey, { opportunities: [] }, 900);
    return json({
      opportunities: [],
      generation_status: result ? "no_confident_content" : "generation_failed",
    });
  }
  if (skipped > 0) {
    console.warn(`[STUDIO] Surfacing ${opps.length}/${rawOpps.length} opportunities for brand ${auth.brand_id}; ${skipped} dropped for low-confidence/placeholder content.`);
  }

  // Assign template layouts deterministically based on seed; filter by brand industry
  const preferred = getCertifiedTemplate(preferredTemplateId);
  const routedOpps = assignCertifiedTemplates(opps.slice(0, 20), auth.brand_id)
    .map((card) => preferred && card.template_format === preferred.format
      ? { ...card, template_id: preferred.id }
      : card);

  // Parallel fetch image suggestions and build full preview cards
  const enrichedPromises = routedOpps.map(async (card, i) => {
    const cardId = card.id || (i + 1);

    const headline = card.headline || card.hook || card.idea || "";
    const bodyText = card.body || (card.caption ? card.caption.slice(0, 120) : "");
    const ctaText = card.cta_text || card.cta || "Learn More";

    // 2. Hero image: search on the card's CONCRETE visual_query (a real photo subject
    //    grounded in the brand's industry) — NOT the abstract headline — across all
    //    active sources (Pexels+Unsplash+Pixabay), ranked for relevance with text/word-
    //    stock puns rejected, and cached. Falls back to the card topic if the model
    //    didn't emit a visual_query.
    let hero_image_url = "";
    try {
      const orientation = (card.template_format === "story" || card.template_format === "reel") ? "portrait" : "landscape";
      const ranked = await searchAndRankMedia({
        visualQuery: card.visual_query || card.idea || headline,
        industry,
        orientation,
      }, env);
      if (ranked && ranked.length > 0) {
        const template = getCertifiedTemplate(card.template_id);
        const heroSlot = template?.slides?.[0]?.slots?.find((s) => s.type === "media");
        const ordered = heroSlot ? rankMediaForSlot(ranked, heroSlot, () => 50) : ranked.map((candidate) => ({ candidate }));
        const best = ordered[0]?.candidate || ranked[0];
        hero_image_url = best.url || best.preview || "";
      }
    } catch (e) {
      console.warn(`[STUDIO] Media suggestion failed for card ${cardId}:`, e.message);
    }

    const previewData = {
      headline,
      body: bodyText,
      cta: ctaText,
      hero_image_url
    };

    const layoutManifest = {
      template_id: card.template_id,
      template_variant: card.template_variant,
      brand_overrides: {
        primary_color: visuals.primary_color || "#1A1A1A",
        secondary_color: visuals.secondary_color || "#F5F5F5",
        font_stack: visuals.font_stack || "Inter, sans-serif",
        logo_url: visuals.logo_url || ""
      },
      slides: [
        { slot_id: "slide_1", text: headline, image_url: hero_image_url }
      ]
    };

    const draftPayload = {
      idea_id: cardId,
      title: card.idea || card.framework || "",
      caption: card.caption || "",
      hook: card.hook || "",
      cta: card.cta || "",
      hashtags: card.hashtags || [],
      platforms: card.platforms || [],
      contentType: card.media_type || (card.template_format === "carousel" ? "carousel" : "social"),
      image: hero_image_url,
      imageSource: "pexels",
      suggested_structure: card.framework || "",
      layout_manifest: layoutManifest,
      source: "studio"
    };

    let preview_url = "";
    try {
      const { renderTemplateFlat } = await import("../templates/renderer.js");
      const png = await renderTemplateFlat(card.template_id, {
        headline,
        body: bodyText,
        cta: ctaText,
        image: hero_image_url,
      }, auth.brand_id, env);
      if (png && env.MEDIA_BUCKET) {
        const r2Key = `previews/${auth.brand_id}/${card.template_id}-${cardId}.png`;
        await env.MEDIA_BUCKET.put(r2Key, png, { httpMetadata: { contentType: "image/png" } });
        preview_url = `${env.BASE_URL || "https://api.mypilotpost.com"}/api/media/file/${r2Key}`;
      }
    } catch (err) {
      console.warn(`[STUDIO] Canonical render failed for card ${cardId}:`, err.code || err.message);
    }

    return {
      ...card,
      id: `card_${cardId}`,
      suggested_template_id: card.template_id,
      suggested_template_variant: card.template_variant,
      suggested_template_family: card.template_format,
      thumbnail_url: hero_image_url,
      preview_data: previewData,
      draft_payload: draftPayload,
      preview_url: preview_url || null
    };
  });

  const enrichedOpps = await Promise.all(enrichedPromises);
  const responseData = { opportunities: enrichedOpps };

  // Write to KV cache. A full batch (target feed size) caches 24h; a short/partial batch
  // caches 1h so it can refill sooner. The target is ~10 (see the prompt), so >= 8 counts
  // as full.
  const ttl = enrichedOpps.length >= 8 ? 86400 : 3600;
  await kvPutJSON(env.STUDIO_CACHE_KV, feedKey, responseData, ttl);

  console.log(`[studio] Generated ${enrichedOpps.length} cards for brand ${auth.brand_id}`);
  console.log(`[studio] Sample card preview_data:`, enrichedOpps[0]?.preview_data);

  return json(responseData);
}

// Quote content shape for quote-category templates. Generates the brand's own
// insight (or a credible industry/customer quote) — NOT a generic inspirational
// cliché. Respects each quote slot's max_chars and clips defensively.
async function generateQuoteContent(env, { brand, brandName, context, template, brand_id, user_id }) {
  const slots = template?.slots || [];
  const slotOf = (key) => slots.find((s) => s.content_key === key);
  const quoteMax = slotOf('quote')?.max_chars || 200;
  const attrMax = slotOf('attribution')?.max_chars || 60;

  const structure = `{ "quote_text": "the quote (max ${quoteMax} chars)", "attribution": "who said it (max ${attrMax} chars)" }`;

  const prompt = `You are ${brandName}'s copywriter. Write ONE short quote-style social post that reads as ${brandName}'s own hard-won insight, or a relevant and credible industry/customer quote — NEVER a generic inspirational cliché.

BRAND CONTEXT:
${context || `Brand: ${brandName}`}

Rules:
- Grounded in this brand's actual voice, positioning, and audience — specific, not universal.
- quote_text: at most ${quoteMax} characters. Punchy. No surrounding quotation marks, no hashtags.
- attribution: a real-sounding source (the brand, a named role e.g. "— The ${brandName} Team", or a credible industry figure), at most ${attrMax} characters.
Return ONLY this JSON: ${structure}`;

  const result = await trackedRunLLM(env, {
    brand: brand || {},
    prompt,
    brand_id,
    user_id: user_id || null,
    content_type: 'studio_quote',
    options: { mode: 'deep', systemPromptType: 'studio' },
  }).catch((e) => { console.warn('[STUDIO] quote generation failed:', e); return null; });

  const clip = (s, n) => (typeof s === 'string' && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  // Empty fields fall through to the template's authored fallback copy at render time.
  return {
    quote: clip(result?.quote_text || result?.quote || '', quoteMax) || undefined,
    attribution: clip(result?.attribution || '', attrMax) || undefined,
    serif_lines: Array.isArray(result?.serif_lines) ? result.serif_lines.slice(0, 2) : undefined,
    script_word: result?.script_word || undefined,
  };
}

// ── POST /api/customer/studio/generate-post ───────────────────────────────────
export async function generateStudioPost(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const { framework, idea, hook, platforms = [], template_id } = body;
  if (!framework) return error("framework is required", 400);

  const db = getDB(env);
  await checkAndIncrement(db, auth.user_id, "ai");
  const { brand, context, brandName, visuals } = await fetchBrandCtx(db, auth.brand_id);
  const platformList = platforms.join(", ") || "Facebook, Instagram";

  let tpl;
  try {
    tpl = template_id
      ? requireCertifiedTemplate(template_id)
      : selectCertifiedTemplate({
          format: formatForCard({ framework }),
          seed: `${auth.brand_id}:${framework}`,
        });
  } catch (err) {
    return error(err.message, err.code || "TEMPLATE_NOT_CERTIFIED", err.details || null, 422);
  }
  const targetTemplateId = tpl.id;
  const caps = capacityFor(tpl.id);
  const constraintsPrompt = `\nCONTENT CAPACITY (do not exceed; the renderer will reject overflow):\n${
    Object.entries(caps).map(([key, cap]) => `- ${key}: max ${cap.maxCharacters} characters, ${cap.maxLines} lines`).join("\n")
  }\n`;

  // Quote-category templates use the dedicated quote content shape instead of the
  // standard headline/body/cta copy. The generated fields flow to the renderer's
  // content_key slots (quote/attribution/serif_lines/script_word) via mergeSlideContent.
  if ((tpl?.category || '').toLowerCase() === 'quote') {
    const q = await generateQuoteContent(env, { brand, brandName, context, template: tpl, brand_id: auth.brand_id, user_id: auth.user_id });
    const quoteText = q.quote_text || q.quote || "";
    const slideContent = { headline: quoteText, body: quoteText, attribution: q.attribution || "" };
    return json({
      body: quoteText,
      quote: quoteText,
      attribution: q.attribution || "",
      hashtags: "",
      layout_manifest: {
        template_id: targetTemplateId,
        brand_overrides: visuals,
        slides: [slideContent],
        animation_preset: tpl.animation_preset || "fade_slide"
      }
    });
  }

  const prompt = `You are an expert copywriter generating a complete content post or script.

BRAND CONTEXT:
${context || `Brand: ${brandName}`}

FRAMEWORK: ${framework}
CONCEPT: ${idea || ""}
HOOK: ${hook || ""}
PLATFORMS: ${platformList}
${constraintsPrompt}
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

  // (template already resolved above as `tpl` / `targetTemplateId`)
  // Map generated copy structure to template slides slots
  const manifestSlides = [];
  let bodyParagraphIndex = 1;
  for (const slide of (tpl?.slides || [])) {
    const slotId = slide.slot_id || `slide_${slide.slide_index || bodyParagraphIndex}`;
    const slideMapping = {
      slot_id: slotId,
      text_anchor: "body_paragraph_" + bodyParagraphIndex
    };

    if (slide.slot_type === "hero" || (slotId && (slotId.includes("cover") || slotId.includes("hook")))) {
      slideMapping.text_anchor = "headline";
    } else if (slide.slot_type === "cta" || (slotId && slotId.includes("cta"))) {
      slideMapping.text_anchor = "cta_text";
    } else {
      bodyParagraphIndex++;
    }

    manifestSlides.push(slideMapping);
  }

  return json({
    body: result.body,
    hook: result.hook || hook || "",
    cta: result.cta || "",
    hashtags: result.hashtags || "",
    platform_variants: result.platform_variants || {},
    layout_manifest: {
      template_id: targetTemplateId,
      brand_overrides: visuals,
      slides: manifestSlides,
      animation_preset: tpl.animation_preset || "fade_slide"
    }
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

VISUAL CONSTRAINTS (YOU MUST COMPLY WITH THESE SLIDES LENGTHS TO PREVENT TEXT CLIPPING):
- Title/headline text: max 24 characters
- Category/pre-headline tags: max 20 characters
- CTA text: max 20 characters
- Slide body text: max 100 characters

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
  const { brand, context, brandName, visuals } = await fetchBrandCtx(db, auth.brand_id);
  const channelList = channels.length ? channels.join(", ") : "Facebook, Instagram, LinkedIn";

  const prompt = `You are a campaign strategist creating a complete launch asset set as visual content cards.

BRAND CONTEXT:
${context || `Brand: ${brandName}`}

CAMPAIGN: ${campaign_name}
OFFER: ${offer}
GOAL: ${goal || "increase awareness and drive conversions"}
CHANNELS: ${channelList}

VISUAL CONSTRAINTS (YOU MUST COMPLY WITH THESE SLIDES LENGTHS TO PREVENT TEXT CLIPPING):
- Title/headline text: max 24 characters
- Category/pre-headline tags: max 20 characters
- CTA text: max 20 characters
- Slide body text: max 100 characters

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

  const cards = [];
  const rawCards = result.cards || [];

  for (let i = 0; i < Math.min(rawCards.length, 6); i++) {
    const c = rawCards[i];
    const postType = (c.post_type || "").toLowerCase().trim();
    
    // Map funnel stages to specific templates
    const roleFormat = postType === "awareness" || postType === "consideration"
      ? "feed_post"
      : postType === "conversion"
        ? "promotional"
        : "feed_post";
    let tpl;
    try {
      tpl = selectCertifiedTemplate({
        format: postType.includes("proof") ? "feed_post" : roleFormat,
        seed: `${auth.brand_id}:campaign:${postType}:${i}`,
        preferredId: postType.includes("proof") ? "mpp.feed.testimonial" : postType === "conversion" ? "mpp.promo.product" : null,
      });
    } catch (err) {
      console.warn(`[STUDIO] campaign: ${err.message}`);
      continue;
    }
    const templateId = tpl.id;
    const manifestSlides = (tpl.slides || []).map((slide) => ({
      slide_id: slide.id,
      headline: c.hook || c.title || "",
      body: c.caption || "",
      cta: c.cta || "",
      label: c.post_type || "",
    }));

    cards.push({
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
      layout_manifest: {
        template_id: templateId,
        brand_overrides: visuals,
        slides: manifestSlides,
        animation_preset: tpl.animation_preset || "fade_slide"
      }
    });
  }

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
    SELECT id, title, body, hook, cta, hashtags, platforms, content_type, lifecycle_status, metadata, created_at, updated_at,
           template_id, layout_manifest, rendered_preview_url
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
