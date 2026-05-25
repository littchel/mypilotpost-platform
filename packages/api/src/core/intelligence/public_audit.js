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

export async function runPublicAudit(request, env) {
  const body = await request.json();
  const { brand_name, website_url, social_handles, industry, goals, platforms } = body;

  const db = getDB(env);

  // 1. Diagnostic Data Collection (Simulated/Estimated for public audit)
  const metrics = {
    platform_count: (social_handles?.length || 0) + (website_url ? 1 : 0),
    post_frequency: 2.5, // Estimated
    engagement_rate: 0.012, // Estimated
    search_visibility: 450, // Estimated
    follower_count: 1200, // Estimated
    has_cta: website_url ? true : false,
    sentiment_score: 0.72
  };

  // 2. Strategic Scoring (Brand DNA Score™)
  const dnaScore = calculateDNAScore(metrics, industry || 'General');

  // 3. Strategic Analysis (Upgraded Schema)
  const weaknesses = [];
  if (metrics.post_frequency < 4) weaknesses.push('low_consistency');
  if (metrics.engagement_rate < 0.02) weaknesses.push('low_engagement');
  if (metrics.platform_count < 3) weaknesses.push('platform_gap');

  const strategicAnalysis = generateStrategicAnalysis(weaknesses, industry);
  const nextSteps = generateNextSteps(dnaScore.breakdown);

  // NARRATIVE DIAGNOSIS ENGINE
  const narrative = generateNarrativeDiagnosis(dnaScore.breakdown, weaknesses, industry || 'General');

  // 4. Build Comprehensive Audit Result
  const audit_id = crypto.randomUUID();
  const auditResult = {
    audit_id,
    brand_name,
    overall_score: dnaScore.overall_score,
    score_breakdown: dnaScore.breakdown,
    methodology: dnaScore.methodology,
    confidence: dnaScore.confidence_indicators,

    // Core Narrative Intelligence
    narrative: narrative,

    // Diagnostic Snapshot
    diagnostic: {
      bio_seo: "OPTIMIZABLE",
      link_ecosystem: website_url ? "HEALTHY" : "MISSING",
      cta_effectiveness: metrics.has_cta ? "CONVERSION-READY" : "FRICTION-HEAVY",
      platform_consistency: "IRREGULAR"
    },

    // Content Genome
    genome: {
      pillar_balance: "SKEWED",
      top_patterns: ["Educational", "Direct Sales"],
      resonance_score: 65
    },

    // Competitive Moat
    moat: {
      whitespace: "High-authority video content in your niche",
      differentiation: "Leverage proprietary business intelligence data"
    },

    strategic_analysis: strategicAnalysis,
    roadmap: {
      duration: "12-Weeks",
      priorities: nextSteps,
      quick_wins: ["Optimize LinkedIn Header", "Schedule 3 recurring posts"]
    }
  };

  // 5. Persist for conversion hydration (includes intake form fields)
  await db.prepare(`
    INSERT INTO brand_audit_results_v2 (
      id, brand_name, website_url, social_handles,
      overall_score, score_breakdown_json, strategic_actions_json,
      next_steps_json, industry, goals_json, platforms_json, preview_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(
    audit_id, brand_name, website_url, JSON.stringify(social_handles || []),
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

  // Also upsert a lead record for conversion tracking
  await db.prepare(`
    INSERT INTO public_audit_leads (id, email, brand_name, website_url, audit_id, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT DO NOTHING
  `).bind(crypto.randomUUID(), email, business_name, audit?.website_url, audit_id).run();

  return json({ success: true, message: 'Report delivery queued' });
}
