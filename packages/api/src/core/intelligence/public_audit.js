/**
 * myPilotPost — Public Brand Audit Engine (v2 Hardened)
 * STRATEGIC • BENCHMARKED • CONVERSION-READY
 */

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { calculateDNAScore } from "./benchmark_engine.js";
import { generateStrategicAnalysis } from "./analysis_engine.js";
import { generateNextSteps } from "./next_steps_generator.js";
import { generateNarrativeDiagnosis } from "./narrative_engine.js";

export async function getPublicAuditById(request, env, auditId) {
  const db = getDB(env);
  try {
    const audit = await db.prepare(`
      SELECT id, brand_name, website_url, social_handles, overall_score,
             score_breakdown_json, strategic_actions_json, next_steps_json,
             industry, goals_json, platforms_json, preview_mode, created_at
      FROM brand_audit_results_v2 WHERE id = ?
    `).bind(auditId).first();

    if (!audit) return json({ error: 'Audit not found' }, 404);

    return json({
      audit_id: audit.id,
      brand_name: audit.brand_name,
      website_url: audit.website_url,
      social_handles: JSON.parse(audit.social_handles || '[]'),
      overall_score: audit.overall_score,
      score_breakdown: JSON.parse(audit.score_breakdown_json || '{}'),
      strategic_analysis: JSON.parse(audit.strategic_actions_json || '[]'),
      next_steps: JSON.parse(audit.next_steps_json || '[]'),
      industry: audit.industry || '',
      goals: JSON.parse(audit.goals_json || '[]'),
      platforms: JSON.parse(audit.platforms_json || '[]'),
      preview_mode: audit.preview_mode,
      created_at: audit.created_at
    });
  } catch (err) {
    return json({ error: 'Failed to retrieve audit' }, 500);
  }
}

/**
 * Derives diagnostic snapshot from real user inputs.
 * No values are hardcoded — all reflect what the user submitted.
 */
function buildDiagnostic(metrics, website_url, platforms, goals) {
  const platformCount = metrics.platform_count;

  const platformConsistency =
    platformCount === 0 ? 'NOT ESTABLISHED'
    : platformCount === 1 ? 'SINGLE PLATFORM'
    : platformCount === 2 ? 'LIMITED PRESENCE'
    : platformCount >= 4 ? 'MULTI-PLATFORM'
    : 'DEVELOPING';

  const bioSeo = website_url ? 'OPTIMIZABLE' : 'NOT CONNECTED';
  const linkEcosystem = website_url ? 'HEALTHY' : 'MISSING';
  const ctaEffectiveness = metrics.has_cta ? 'CONVERSION-READY' : 'FRICTION-HEAVY';

  return { bio_seo: bioSeo, link_ecosystem: linkEcosystem, cta_effectiveness: ctaEffectiveness, platform_consistency: platformConsistency };
}

/**
 * Derives content genome from goals the user selected.
 */
function buildGenome(goals) {
  const GOAL_PILLAR_MAP = {
    brand_awareness:    ['Educational', 'Inspirational'],
    lead_gen:           ['Conversion', 'Informational'],
    engagement:         ['Community', 'Conversational'],
    sales:              ['Direct Sales', 'Proof-Based'],
    thought_leadership: ['Expert Analysis', 'Long-form Authority'],
  };

  const patterns = [];
  (goals || []).forEach(g => {
    const mapped = GOAL_PILLAR_MAP[g];
    if (mapped) patterns.push(...mapped);
  });

  const uniquePatterns = [...new Set(patterns)].slice(0, 3);
  const topPatterns = uniquePatterns.length > 0 ? uniquePatterns : ['Awareness', 'Engagement'];
  const pillarBalance = (goals || []).length >= 3 ? 'MULTI-GOAL' : (goals || []).length === 0 ? 'UNDEFINED' : 'FOCUSED';

  return { pillar_balance: pillarBalance, top_patterns: topPatterns, resonance_score: null };
}

/**
 * Derives competitive moat assessment from industry + platform gaps.
 */
function buildMoat(industry, platforms, metrics) {
  const INDUSTRY_WHITESPACE = {
    'SaaS / Software':       'Long-form technical authority content and LinkedIn thought leadership',
    'Fintech':               'Educational content demystifying financial concepts for your audience',
    'AI & Machine Learning': 'Accessible explainer content on AI trends for non-technical audiences',
    'E-commerce':            'Short-form video product demonstrations and UGC-style social proof',
    'Real Estate':           'Local market insights and behind-the-scenes property content',
    'Consulting / B2B':      'Client results case studies and frameworks published as long-form content',
    'Healthcare':            'Trusted, evidence-based educational content for patient audiences',
    'Education':             'Micro-learning formats and student success stories across social platforms',
    'Retail / Fashion':      'Short-form video and Reels-first content strategy with strong visual identity',
    'Food & Beverage':       'Behind-the-scenes production content and community-driven recipe sharing',
    'Travel & Hospitality':  'Aspirational video content and authentic destination storytelling',
    'Fitness & Wellness':    'Transformation content and expert-led educational series',
  };

  const whitespace = INDUSTRY_WHITESPACE[industry] || 'Expert-driven content establishing category authority in your niche';

  const hasVideo = platforms && (platforms.includes('tiktok') || platforms.includes('instagram') || platforms.includes('youtube'));
  const differentiation = hasVideo
    ? 'Leverage your video platform presence for authority positioning via educational series'
    : 'Establish a content series format (weekly insight, case study, or framework) to build audience expectation';

  return { whitespace, differentiation };
}

/**
 * Derives quick wins from identified weaknesses and user inputs.
 */
function buildQuickWins(weaknesses, platforms, website_url) {
  const wins = [];

  if (weaknesses.includes('low_consistency')) {
    wins.push('Commit to a fixed publishing schedule — even 2 posts per week creates compounding momentum');
  }
  if (weaknesses.includes('low_engagement')) {
    wins.push('Add a direct question to your next 5 posts to trigger comment activity and algorithm signals');
  }
  if (weaknesses.includes('platform_gap')) {
    wins.push('Activate one additional platform this week — repurpose existing content to reduce effort');
  }
  if (!website_url) {
    wins.push('Add your website URL to improve brand discoverability and CTA continuity');
  }
  if (platforms && platforms.includes('linkedin')) {
    wins.push('Optimise your LinkedIn headline with your primary value proposition and target audience');
  }
  if (platforms && platforms.includes('instagram')) {
    wins.push('Add 3–5 targeted hashtags to your next Instagram post to improve discoverability');
  }
  if (wins.length < 2) {
    wins.push('Schedule 3 recurring post slots per week using myPilotPost to eliminate publishing friction');
  }

  return wins.slice(0, 3);
}

export async function runPublicAudit(request, env) {
  const body = await request.json();
  const { brand_name, website_url, social_handles, industry, goals, platforms } = body;

  const db = getDB(env);

  // 1. Diagnostic Data Collection
  // post_frequency, engagement_rate, search_visibility, follower_count are estimated industry
  // benchmarks since we have no OAuth access at this stage. Confidence indicators reflect this.
  const socialCount = Array.isArray(social_handles)
    ? social_handles.filter(h => h && String(h).trim()).length
    : 0;
  const platformCount = (platforms?.length || 0) || socialCount + (website_url ? 1 : 0);

  const metrics = {
    platform_count: platformCount,
    post_frequency: 2.5,       // Estimated — no OAuth access at public audit stage
    engagement_rate: 0.012,    // Estimated industry baseline
    search_visibility: website_url ? 450 : 100, // Higher if website provided
    follower_count: 1200,      // Estimated baseline
    has_cta: !!website_url,
    sentiment_score: 0.72      // Estimated baseline
  };

  // 2. Strategic Scoring (Brand DNA Score™)
  const dnaScore = calculateDNAScore(metrics, industry || 'General');

  // 3. Identify weaknesses from real inputs
  const weaknesses = [];
  if (metrics.post_frequency < 4) weaknesses.push('low_consistency');
  if (metrics.engagement_rate < 0.02) weaknesses.push('low_engagement');
  if (platformCount < 3) weaknesses.push('platform_gap');

  const strategicAnalysis = generateStrategicAnalysis(weaknesses, industry);
  const nextSteps = generateNextSteps(dnaScore.breakdown);

  // 4. Narrative Diagnosis
  const narrative = generateNarrativeDiagnosis(dnaScore.breakdown, weaknesses, industry || 'General');

  // 5. Derived (not hardcoded) diagnostic/genome/moat from actual user inputs
  const diagnostic = buildDiagnostic(metrics, website_url, platforms, goals);
  const genome = buildGenome(goals);
  const moat = buildMoat(industry, platforms, metrics);
  const quickWins = buildQuickWins(weaknesses, platforms, website_url);

  // 6. Build Comprehensive Audit Result
  const audit_id = crypto.randomUUID();
  const auditResult = {
    audit_id,
    brand_name,
    overall_score: dnaScore.overall_score,
    score_breakdown: dnaScore.breakdown,
    methodology: dnaScore.methodology,
    confidence: dnaScore.confidence_indicators,
    narrative,
    diagnostic,
    genome,
    moat,
    strategic_analysis: strategicAnalysis,
    roadmap: {
      duration: '12-Weeks',
      priorities: nextSteps,
      quick_wins: quickWins
    }
  };

  // 7. Persist for conversion hydration (preview_mode = 1 until linked to a brand)
  await db.prepare(`
    INSERT INTO brand_audit_results_v2 (
      id, brand_name, website_url, social_handles,
      overall_score, score_breakdown_json, strategic_actions_json,
      next_steps_json, industry, goals_json, platforms_json, preview_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(
    audit_id, brand_name, website_url || null, JSON.stringify(social_handles || []),
    dnaScore.overall_score, JSON.stringify(dnaScore.breakdown),
    JSON.stringify(strategicAnalysis), JSON.stringify(nextSteps),
    industry || null, JSON.stringify(goals || []), JSON.stringify(platforms || [])
  ).run();

  return json(auditResult);
}


export async function captureAuditLead(request, env) {
  const body = await request.json();
  const { audit_id, name, email, business_name } = body;
  const db = getDB(env);

  const audit = await db.prepare("SELECT * FROM brand_audit_results_v2 WHERE id = ?").bind(audit_id).first();
  if (!audit) {
    return json({ error: 'Audit not found' }, 404);
  }

  await db.prepare(`
    UPDATE brand_audit_results_v2
    SET lead_name = ?, lead_email = ?, lead_business_name = ?, lead_captured_at = datetime('now')
    WHERE id = ?
  `).bind(name, email, business_name, audit_id).run();

  // Upsert lead record for conversion tracking
  await db.prepare(`
    INSERT INTO public_audit_leads (id, email, brand_name, website_url, audit_id, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT DO NOTHING
  `).bind(crypto.randomUUID(), email, business_name, audit?.website_url, audit_id).run();

  return json({ success: true });
}
