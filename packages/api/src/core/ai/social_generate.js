// packages/api/src/core/ai/social_generate.js
// myPilotPost — AI Social Generation v2.0

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import { trackedRunLLM } from "./ai_client.js";

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

const GENERIC_BANNED = [
  "Most people don't know",
  "Game changer",
  "Unlock your potential",
  "Revolutionize your",
  "Take your business to the next level",
  "In today's fast-paced world",
  "Excited to share",
  "Proud to announce",
  "We're thrilled",
  "The secret is",
  "You won't believe",
  "Mind-blowing",
  "Crushing it",
  "Level up",
  "Hustle harder",
];

/* ======================================================
   Fetch Brand DNA from all DNA tables
====================================================== */
async function fetchBrandDNA(db, brand_id) {
  const [brand, profile, voice, audience, pillars] = await Promise.all([
    db.prepare("SELECT id, name, industry, website FROM brands WHERE id = ?").bind(brand_id).first(),
    db.prepare("SELECT mission, vision, positioning, value_proposition, brand_personality, differentiators FROM brand_dna_profiles WHERE brand_id = ?").bind(brand_id).first(),
    db.prepare("SELECT voice_traits, forbidden_language, cta_style, messaging_style FROM brand_dna_voice WHERE brand_id = ?").bind(brand_id).first(),
    db.prepare("SELECT icp_name, pain_points, desires FROM brand_dna_audience WHERE brand_id = ?").bind(brand_id).first(),
    db.prepare("SELECT title, description FROM brand_dna_content_pillars WHERE brand_id = ? LIMIT 5").bind(brand_id).all(),
  ]);

  return { brand, profile, voice, audience, pillars: pillars?.results || [] };
}

function buildBrandContext(dna) {
  const { brand, profile, voice, audience, pillars } = dna;
  const parts = [];

  if (brand?.name)                 parts.push(`Brand: ${brand.name}`);
  if (brand?.industry)             parts.push(`Industry: ${brand.industry}`);
  if (profile?.positioning)        parts.push(`Positioning: ${profile.positioning}`);
  if (profile?.value_proposition)  parts.push(`Value Proposition: ${profile.value_proposition}`);
  if (profile?.mission)            parts.push(`Mission: ${profile.mission}`);

  if (voice?.voice_traits) {
    const traits = parseJsonSafe(voice.voice_traits, []);
    if (traits.length) parts.push(`Voice Traits: ${traits.join(", ")}`);
  }
  if (voice?.messaging_style)      parts.push(`Messaging Style: ${voice.messaging_style}`);

  const forbidden = [];
  if (voice?.forbidden_language) {
    const fl = parseJsonSafe(voice.forbidden_language, []);
    if (fl.length) forbidden.push(...fl);
  }
  forbidden.push(...GENERIC_BANNED);

  if (audience?.icp_name)          parts.push(`Target Audience: ${audience.icp_name}`);
  if (audience?.pain_points) {
    const pains = parseJsonSafe(audience.pain_points, []);
    if (pains.length) parts.push(`Audience Pain Points: ${pains.slice(0, 3).join("; ")}`);
  }

  if (pillars.length) {
    parts.push(`Content Pillars: ${pillars.map(p => p.title).join(", ")}`);
  }

  return { context: parts.join("\n"), forbidden };
}

function parseJsonSafe(val, fallback) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function buildPrompt({ brandContext, forbidden, intention, tone, ctaLabel, platforms, count }) {
  const platformList = platforms.join(", ");
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const forbiddenList = forbidden.slice(0, 15).map(f => `"${f}"`).join(", ");

  return `You are an expert social media copywriter for a specific brand. Generate ${count} high-quality social media post variant(s) for: ${platformList}.

BRAND CONTEXT:
${brandContext}

CONTENT BRIEF:
- Primary Goal: ${intention}
- Tone/Voice: ${tone} — ${toneInstruction}
- Call to Action type: ${ctaLabel}
- Target Platforms: ${platformList}

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

  // Fetch Brand DNA
  const dna = await fetchBrandDNA(db, auth.brand_id);
  const { context: brandContext, forbidden } = buildBrandContext(dna);

  const prompt = buildPrompt({
    brandContext: brandContext || `Brand: ${dna.brand?.name || "Unknown Brand"}`,
    forbidden,
    intention,
    tone,
    ctaLabel: cta,
    platforms: platforms.filter(p => ALLOWED_PLATFORMS.includes(p)),
    count: Math.min(count, 3),
  });

  const result = await trackedRunLLM(env, {
    brand: dna.brand || {},
    prompt,
    brand_id: auth.brand_id,
    user_id: auth.user_id,
    content_type: "social",
    platform: platforms[0] || null,
  });

  const generatedPosts = result?.posts || [];

  if (generatedPosts.length === 0) {
    return json({ error: "AI service temporarily unavailable. Please try again." }, 503);
  }

  return json({
    posts: generatedPosts,
    brand_name: dna.brand?.name || null,
  });
}
