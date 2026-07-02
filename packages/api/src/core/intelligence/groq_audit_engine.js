/**
 * myPilotPost — Groq Audit Engine
 * Generates a 13-section evidence-based brand audit via Groq LLM.
 *
 * POLICY:
 * - Every finding must reference observable evidence from the crawled data.
 * - Industry must be specific — never "General".
 * - Recommendations must be unrecognisable to a different business.
 * - Never invent metrics. Use "appears to", "suggests", "likely" for inferences.
 *
 * TOKEN BUDGET:
 * - Input target: ≤ 3,500 tokens (enforced by audit_context_builder)
 * - Output budget: dynamic (3,500–5,000 based on input size)
 * - Total target: ≤ 11,000 tokens per request
 */

import { buildAuditContextSafe, estimateTokens, dynamicOutputBudget } from './audit_context_builder.js';
import { getDB } from '../../lib/db.js';

const GROQ_API_URL        = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL          = 'openai/gpt-oss-120b';
const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior brand strategist and digital analyst producing evidence-based Social Media Brand Audits for real businesses.

ABSOLUTE RULES:
1. Every finding MUST reference specific evidence from the data provided (website content, social profiles, CTAs, headings, etc.)
2. NEVER classify industry as "General" — always determine the specific industry and niche
3. NEVER output recommendations that could apply to any business — each must be specific to THIS business
4. NEVER invent engagement rates, follower counts, conversion rates, or any metric not in the input data
5. Use "appears to", "suggests", "likely", "based on the website" for inferences
6. Competitor names must be real, plausible companies in the same specific niche and geography
7. The report must be unrecognisable when compared to an audit for a different business
8. If the website is inaccessible or has minimal content, say so clearly and work with what is available
9. Return ONLY valid JSON — no markdown, no commentary outside the JSON object`;

// ─── Task prompt — wraps compressed context with the 13-section JSON schema ──

function buildTaskPrompt(compressedContext, websiteUrl) {
  const domain = (() => { try { return new URL(websiteUrl).hostname; } catch { return websiteUrl; } })();

  return `${compressedContext}

=== TASK ===
Analyze the above evidence and produce a comprehensive Social Media Brand Audit for ${domain}.

Return a single JSON object with exactly the following structure. Every string must be specific to this business — use the actual company name, actual findings, actual platform URLs. Never use placeholder text.

{
  "brand_score": {
    "overall": <integer 0-100>,
    "rationale": "<2-3 sentences explaining the score based on evidence>",
    "dimensions": {
      "web_presence": <0-100>,
      "social_presence": <0-100>,
      "content_strategy": <0-100>,
      "brand_consistency": <0-100>,
      "conversion_readiness": <0-100>
    }
  },

  "business_profile": {
    "company_name": "<name from website>",
    "industry": "<specific industry — NEVER General>",
    "niche": "<specific sub-niche>",
    "business_model": "<how they make money: B2C service / e-commerce / B2B / subscription / etc.>",
    "target_audience": "<who they serve — be specific>",
    "primary_offer": "<main product or service>",
    "secondary_offers": ["<offer 1>", "<offer 2>"],
    "geographic_market": "<market served>",
    "confidence": "<observed|inferred|estimated>",
    "evidence": "<what website signals determined this>"
  },

  "diagnostic_snapshot": {
    "executive_summary": "<4-5 sentences written specifically for this business — reference their actual name, actual offers, actual gaps>",
    "brand_positioning_assessment": "<how the brand currently positions itself and whether it works>",
    "strategic_strengths": ["<strength referencing specific evidence>", "<strength>", "<strength>"],
    "strategic_weaknesses": ["<weakness referencing specific evidence>", "<weakness>", "<weakness>"],
    "strategic_risks": ["<risk>", "<risk>"],
    "growth_opportunities": ["<opportunity specific to this business and market>", "<opportunity>", "<opportunity>"]
  },

  "social_presence_review": {
    "platforms_found": [
      {"platform": "<name>", "url": "<url or not found>", "status": "<active|inactive|not_found|blocked>", "source": "<website_link|discovered|not_found>", "notes": "<observations about this profile>"}
    ],
    "platforms_missing": ["<platform name and why it matters for this specific business>"],
    "profile_quality_review": "<overall assessment of profile quality based on what was accessible>",
    "bio_review": "<assessment of bios and descriptions found>",
    "cta_review": "<assessment of call-to-action presence in social profiles>",
    "platform_opportunities": ["<specific opportunity on a specific platform for this business>"]
  },

  "brand_identity_review": {
    "logo_assessment": "<assessment based on OG image and visual signals available>",
    "colour_consistency": "<what colour signals were detected and assessment>",
    "typography_consistency": "<inferred from website and profile data>",
    "visual_identity_consistency": "<overall consistency assessment across touchpoints found>",
    "trust_signal_assessment": "<emails, phone, address, certifications, testimonials found>",
    "confidence": "inferred"
  },

  "content_genome_analysis": {
    "estimated_content_mix": {
      "educational": <0-100>,
      "promotional": <0-100>,
      "social_proof": <0-100>,
      "community": <0-100>,
      "thought_leadership": <0-100>
    },
    "mix_basis": "<explain how you estimated this from available evidence>",
    "strongest_themes": ["<theme found in website content>"],
    "weakest_themes": ["<theme absent from website content>"],
    "missing_themes": ["<content type that would serve this business but is absent>"],
    "content_observations": "<specific observations about their content approach based on evidence>",
    "confidence": "estimated"
  },

  "audience_resonance_review": {
    "audience_alignment": "<does the messaging match the stated/apparent target audience>",
    "messaging_effectiveness": "<how clear and compelling is the core message>",
    "value_proposition_assessment": "<is the value proposition clear from the website>",
    "trust_building_opportunities": ["<specific trust-building action for this business>", "<action>"]
  },

  "competitive_moat_map": {
    "competitor_overview": "<name 3-5 real, plausible competitors in the same specific niche and geography — explain why>",
    "positioning_overlaps": ["<where this brand's positioning overlaps with likely competitors>"],
    "authority_gaps": ["<where competitors likely have more authority>"],
    "content_gaps": ["<content topics competitors likely cover that this brand does not>"],
    "whitespace_opportunities": ["<positioning or content whitespace this brand could own>"]
  },

  "conversion_architecture_review": {
    "website_assessment": "<overall website conversion readiness>",
    "landing_page_assessment": "<assessment of key landing pages or home page conversion flow>",
    "lead_capture_assessment": "<forms, email capture, lead magnets found or missing>",
    "contact_path_assessment": "<how easy is it to contact or enquire>",
    "conversion_friction_points": ["<specific friction point found>"],
    "trust_gaps": ["<specific trust element missing>"],
    "cta_weaknesses": ["<specific CTA that could be stronger>"],
    "conversion_opportunities": ["<specific improvement opportunity>"]
  },

  "swot": {
    "strengths": ["<strength traced to specific audit finding>", "<strength>", "<strength>"],
    "weaknesses": ["<weakness traced to specific audit finding>", "<weakness>", "<weakness>"],
    "opportunities": ["<opportunity specific to this business and market>", "<opportunity>", "<opportunity>"],
    "threats": ["<threat relevant to this specific business>", "<threat>"]
  },

  "strategic_roadmap": {
    "quick_wins": [
      {"action": "<specific action — name the actual platform, page, or element>", "references_issue": "<which finding this addresses>", "business_impact": "<why this matters for this business specifically>", "expected_outcome": "<what improvement to expect>", "timeframe": "0-7 days"},
      {"action": "<specific action>", "references_issue": "<finding>", "business_impact": "<impact>", "expected_outcome": "<outcome>", "timeframe": "0-7 days"}
    ],
    "growth_plays": [
      {"action": "<specific action>", "references_issue": "<finding>", "business_impact": "<impact>", "expected_outcome": "<outcome>", "timeframe": "30 days"},
      {"action": "<specific action>", "references_issue": "<finding>", "business_impact": "<impact>", "expected_outcome": "<outcome>", "timeframe": "30 days"}
    ],
    "strategic_investments": [
      {"action": "<specific action>", "references_issue": "<finding>", "business_impact": "<impact>", "expected_outcome": "<outcome>", "timeframe": "60-90 days"},
      {"action": "<specific action>", "references_issue": "<finding>", "business_impact": "<impact>", "expected_outcome": "<outcome>", "timeframe": "60-90 days"}
    ]
  },

  "growth_forecast": {
    "visibility_opportunities": ["<specific visibility opportunity for this business>"],
    "authority_opportunities": ["<specific authority-building opportunity>"],
    "conversion_opportunities": ["<specific conversion improvement opportunity>"],
    "audience_growth_opportunities": ["<specific audience growth path>"],
    "assumptions": "<clearly state what assumptions underpin the forecast>",
    "confidence": "estimated"
  },

  "audit_confidence": {
    "data_quality": "<overall quality of the data gathered>",
    "observed_findings": ["<finding directly confirmed from crawled data>"],
    "inferred_findings": ["<finding derived from available signals>"],
    "estimated_findings": ["<finding extrapolated from industry patterns>"],
    "limitations": "<what data was unavailable that would improve the audit>"
  },

  "unlock_verified_intelligence": {
    "current_limitations": "<what this public audit cannot assess>",
    "what_becomes_available": {
      "audience_analytics": "<specific value for this business>",
      "engagement_analytics": "<specific value>",
      "content_analytics": "<specific value>",
      "search_console": "<specific value for this business's SEO situation>",
      "growth_tracking": "<specific value>"
    },
    "value_proposition": "<one compelling sentence about why connecting accounts matters for this specific business>"
  }
}`;
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function callGroqAPI(apiKey, model, systemPrompt, userPrompt, maxOutputTokens) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.25,
      max_tokens: maxOutputTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Groq API ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateGroqAudit(website, socialSummary, env) {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY secret is not configured in this Worker');

  // ── Step 1: Build compressed intelligence context ──────────────────────────
  const { context, tokens: contextTokens, compressed } = buildAuditContextSafe(website, socialSummary, 3500);

  // ── Step 2: Dynamic output budget ─────────────────────────────────────────
  const maxOutputTokens = dynamicOutputBudget(contextTokens);
  console.log(`[AUDIT_OUTPUT_BUDGET] context=~${contextTokens}tok → max_tokens=${maxOutputTokens}`);

  // ── Step 3: Estimate total request size before sending ───────────────────
  const userPrompt    = buildTaskPrompt(context, website.url);
  const inputTokens   = estimateTokens(SYSTEM_PROMPT + userPrompt);
  const totalEstimate = inputTokens + maxOutputTokens;
  console.log(`[AUDIT_TOKEN_ESTIMATE] input=~${inputTokens}tok output_max=${maxOutputTokens}tok total=~${totalEstimate}tok compressed=${compressed}`);

  // ── Step 4: Send to Groq (with 8B fallback) ──────────────────────────────
  console.log(`[AUDIT_GROQ_REQUEST] model=${GROQ_MODEL} temp=0.25 max_tokens=${maxOutputTokens}`);

  const reqStart = Date.now();
  let data;
  let usedModel = GROQ_MODEL;
  try {
    data = await callGroqAPI(apiKey, GROQ_MODEL, SYSTEM_PROMPT, userPrompt, maxOutputTokens);
  } catch (err70b) {
    console.warn(`[AUDIT_GROQ_70B_FAIL] ${err70b.message} — retrying with ${GROQ_FALLBACK_MODEL}`);
    try {
      data = await callGroqAPI(apiKey, GROQ_FALLBACK_MODEL, SYSTEM_PROMPT, userPrompt, maxOutputTokens);
      usedModel = GROQ_FALLBACK_MODEL;
    } catch (err8b) {
      console.error(`[AUDIT_GROQ_FAILURE] fallback also failed: ${err8b.message}`);
      throw err8b;
    }
  }

  const raw  = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Groq returned an empty response');

  const usedInput   = data.usage?.prompt_tokens     || 0;
  const usedOutput  = data.usage?.completion_tokens  || 0;
  const totalTokens = usedInput + usedOutput;
  const latencyMs   = Date.now() - reqStart;
  console.log(`[AUDIT_GROQ_RESPONSE] model=${usedModel} actual_input=${usedInput}tok actual_output=${usedOutput}tok total=${totalTokens}tok`);

  // Track to ai_generations (public audit — no user_id or brand_id)
  try {
    const db = getDB(env);
    await db.prepare(`
      INSERT INTO ai_generations
        (id, brand_id, user_id, content_type, platform, input_prompt, output,
         model, provider, tokens_used, latency_ms, success, status, created_at)
      VALUES (?, null, null, 'public_audit', null, ?, ?, ?, 'groq', ?, ?, 1, 'ok', datetime('now'))
    `).bind(
      crypto.randomUUID(),
      userPrompt.slice(0, 2000), raw.slice(0, 4000),
      usedModel, totalTokens, latencyMs
    ).run();
  } catch (trackErr) {
    console.error('[AUDIT_TRACKING_ERROR]', trackErr.message);
  }

  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]+\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('Groq response is not valid JSON');
  }
}
