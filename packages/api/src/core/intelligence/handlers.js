/**
 * myPilotPost — Intelligence API
 * AUTHORITATIVE • SYSTEM CORE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";

/**
 * GET /api/customer/intelligence
 */
export async function listInsights(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT * FROM brand_insights
    WHERE brand_id = ? AND resolved = 0
    ORDER BY priority DESC, created_at DESC
    LIMIT ?
  `).bind(brand_id, parseInt(new URL(request.url).searchParams.get("limit")) || 50).all();

  return json({ data: results });
}

/**
 * POST /api/customer/intelligence/resolve
 */
export async function resolveInsight(request, env, auth) {
  const { brand_id, user_id } = auth;
  const body = await request.json();
  const { insight_id } = body;

  if (!insight_id) return error("Insight ID required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  const { success } = await db.prepare(`
    UPDATE brand_insights
    SET resolved = 1, resolved_at = datetime('now'), resolved_by = ?
    WHERE id = ? AND brand_id = ?
  `).bind(user_id, insight_id, brand_id).run();

  if (success) {
    await emitEvent(env, 'insight_resolved', {
      brand_id,
      user_id,
      metadata: { insight_id }
    });
  }

  return json({ success: !!success });
}

/**
 * GET /api/customer/intelligence/audits
 */
export async function listAudits(request, env, auth) {
  const { brand_id, user_id } = auth;
  const db = getDB(env);

  // Primary: audits already linked to this brand
  const { results: linked } = await db.prepare(`
    SELECT id, brand_name, overall_score, created_at, preview_mode
    FROM brand_audit_results_v2
    WHERE brand_id = ?
    ORDER BY created_at DESC
  `).bind(brand_id).all();

  if (linked.length > 0) return json({ data: linked });

  // Fallback: unlinked public audit for this user via lead capture or onboarding progress
  // Handles users who completed onboarding before the hydration fix was deployed
  const lead = await db.prepare(`
    SELECT audit_id FROM public_audit_leads WHERE converted_user_id = ? ORDER BY created_at DESC LIMIT 1
  `).bind(user_id).first();

  if (lead?.audit_id) {
    const audit = await db.prepare(`
      SELECT id, brand_name, overall_score, created_at, preview_mode
      FROM brand_audit_results_v2 WHERE id = ?
    `).bind(lead.audit_id).first();
    if (audit) return json({ data: [audit] });
  }

  // Last resort: check onboarding progress for an embedded auditId
  const progress = await db.prepare(
    "SELECT data FROM onboarding_progress WHERE user_id = ?"
  ).bind(user_id).first();
  if (progress?.data) {
    try {
      const { auditId } = JSON.parse(progress.data);
      if (auditId) {
        const audit = await db.prepare(`
          SELECT id, brand_name, overall_score, created_at, preview_mode
          FROM brand_audit_results_v2 WHERE id = ?
        `).bind(auditId).first();
        if (audit) return json({ data: [audit] });
      }
    } catch {}
  }

  return json({ data: [] });
}

// Industry benchmark lookup (mirrors benchmark_engine.js)
const INDUSTRY_BENCHMARKS = {
  'SaaS':        { avg_score: 62, top_10_percent: 88, engagement_baseline: "1.8%" },
  'E-commerce':  { avg_score: 48, top_10_percent: 82, engagement_baseline: "3.5%" },
  'Real Estate': { avg_score: 52, top_10_percent: 80, engagement_baseline: "2.5%" },
};
const DEFAULT_BENCHMARK = { avg_score: 55, top_10_percent: 85, engagement_baseline: "2.1%" };

function getBenchmarks(industry) {
  if (!industry) return DEFAULT_BENCHMARK;
  for (const [key, val] of Object.entries(INDUSTRY_BENCHMARKS)) {
    if (industry.includes(key)) return val;
  }
  return DEFAULT_BENCHMARK;
}

function safeJSON(str, fallback = null) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/**
 * GET /api/customer/intelligence/audits/:id
 */
export async function getFullAudit(request, env, auth) {
  const { brand_id } = auth;
  const auditId = request.url.split('/').pop();
  const db = getDB(env);

  const audit = await db.prepare(`
    SELECT id, brand_name, website_url, social_handles, overall_score,
           score_breakdown_json, strategic_actions_json, next_steps_json,
           industry, goals_json, platforms_json, preview_mode, brand_id, created_at
    FROM brand_audit_results_v2
    WHERE id = ? AND (brand_id = ? OR preview_mode = 1)
  `).bind(auditId, brand_id).first();

  if (!audit) return error("Audit not found", "NOT_FOUND", null, 404);

  const strategicAnalysis = safeJSON(audit.strategic_actions_json, []);
  const nextSteps = safeJSON(audit.next_steps_json, []);

  // Derive quick wins from stored strategic recommendations (not stored separately)
  const quickWins = strategicAnalysis
    .filter(a => a.recommendation)
    .slice(0, 3)
    .map(a => a.recommendation);

  return json({
    id: audit.id,
    brand_name: audit.brand_name,
    website_url: audit.website_url,
    overall_score: audit.overall_score,
    industry: audit.industry,
    preview_mode: audit.preview_mode,
    created_at: audit.created_at,
    score_breakdown: safeJSON(audit.score_breakdown_json, {}),
    strategic_analysis: strategicAnalysis,
    next_steps: nextSteps,
    goals: safeJSON(audit.goals_json, []),
    platforms: safeJSON(audit.platforms_json, []),
    benchmarks: getBenchmarks(audit.industry),
    roadmap: {
      duration: '12-Weeks',
      priorities: nextSteps,
      quick_wins: quickWins,
    },
  });
}
