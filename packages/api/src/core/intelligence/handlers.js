/**
 * myPilotPost — Intelligence API
 * AUTHORITATIVE • SYSTEM CORE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";
import { generateBrandIntelligence } from "./brand_intelligence_engine.js";
import {
  storeIntelligenceBatch,
  getIntelligenceFeed,
  dismissIntelligenceItem,
  isEligibleForGeneration,
  markGenerationComplete,
} from "./brand_intelligence_store.js";
import {
  getDashboardItem,
  recordImpression,
  acknowledgeItem,
} from "./intelligence_lifecycle.js";

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
    await emitEvent(env, 'insight_resolved', { brand_id, user_id, metadata: { insight_id } });
  }

  return json({ success: !!success });
}

/**
 * GET /api/customer/intelligence/audits
 */
export async function listAudits(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT id, brand_name, overall_score, created_at, preview_mode
    FROM brand_audit_results_v2
    WHERE brand_id = ?
    ORDER BY created_at DESC
  `).bind(brand_id).all();

  return json({ data: results });
}

function safeJSON(str, fallback = null) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function getBenchmarks(industry) {
  const map = {
    'SaaS':        { avg_score: 62, top_10_percent: 88, engagement_baseline: "1.8%" },
    'E-commerce':  { avg_score: 48, top_10_percent: 82, engagement_baseline: "3.5%" },
    'Real Estate': { avg_score: 52, top_10_percent: 80, engagement_baseline: "2.5%" },
  };
  if (!industry) return { avg_score: 55, top_10_percent: 85, engagement_baseline: "2.1%" };
  for (const [key, val] of Object.entries(map)) {
    if (industry.includes(key)) return val;
  }
  return { avg_score: 55, top_10_percent: 85, engagement_baseline: "2.1%" };
}

/* ══════════════════════════════════════════════════════════════════════════
   BRAND INTELLIGENCE V3 — DAILY STRATEGIC INTELLIGENCE SYSTEM
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Core generation function — called by the API handler and the daily cron.
 * Checks daily gate, runs Groq once, stores to queue.
 */
export async function runDailyIntelligence(env, brandId, force = false) {
  const db = getDB(env);

  if (!force) {
    const eligible = await isEligibleForGeneration(db, brandId);
    if (!eligible) {
      console.log(`[INTEL_DAILY] brand=${brandId} skipped — generated < 23h ago`);
      return { generated: false, reason: 'rate_limited' };
    }
  }

  console.log(`[INTEL_DAILY] Generating for brand=${brandId}`);

  let groqResult;
  try {
    groqResult = await generateBrandIntelligence(db, brandId, env);
  } catch (err) {
    console.error(`[INTEL_DAILY] Groq failed for brand=${brandId}: ${err.message}`);
    return { generated: false, reason: 'groq_error', error: err.message };
  }

  const batchId = crypto.randomUUID();
  const count = await storeIntelligenceBatch(db, brandId, batchId, groqResult);
  await markGenerationComplete(db, brandId);

  console.log(`[INTEL_DAILY] Stored ${count} items for brand=${brandId} batch=${batchId}`);
  return { generated: true, batch_id: batchId, item_count: count };
}

/**
 * GET /api/customer/intelligence/feed
 *
 * Daily gate: generates if not generated today.
 * Returns progressive feed — delivers next batch of insights.
 */
export async function getIntelligenceFeedHandler(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  let justGenerated = false;
  let generationStatus = null;

  // Check daily gate and generate if needed
  const eligible = await isEligibleForGeneration(db, brand_id);
  if (eligible) {
    const result = await runDailyIntelligence(env, brand_id, true);
    justGenerated = result.generated;
    generationStatus = result;
  }

  // Check connected platform count (gate enforcement)
  const platformRow = await db.prepare(`
    SELECT COUNT(*) as total FROM social_connections
    WHERE brand_id = ? AND status = 'active'
  `).bind(brand_id).first();
  const platformCount = platformRow?.total || 0;

  // If < 2 platforms and no intelligence exists yet, return gate state
  if (platformCount < 2) {
    const hasExisting = await db.prepare(`
      SELECT COUNT(*) as total FROM brand_intelligence_queue WHERE brand_id = ?
    `).bind(brand_id).first();
    if (!hasExisting?.total) {
      return json({ requires_platforms: true, platform_count: platformCount, delivered: [], new_insights: [], pending_count: 0, notifications: [], batch_id: null, generated_at: null });
    }
  }

  // Progressive delivery feed
  const feed = await getIntelligenceFeed(db, brand_id);

  return json({
    ...feed,
    platform_count: platformCount,
    just_generated: justGenerated,
    generation_status: generationStatus,
  });
}

/**
 * POST /api/customer/intelligence/dismiss/:id
 * Dismisses and acknowledges the item (stops all dashboard reminders).
 */
export async function dismissIntelligenceHandler(request, env, auth) {
  const { brand_id } = auth;
  const itemId = request.url.split('/').pop();
  if (!itemId) return error("Item ID required", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  await dismissIntelligenceItem(db, brand_id, itemId);
  await acknowledgeItem(db, brand_id, itemId);
  return json({ success: true });
}

/**
 * GET /api/customer/intelligence/dashboard
 * Lifecycle-aware feed for the dashboard sidebar.
 * Returns the single highest-priority eligible item + queue count.
 */
export async function getDashboardFeedHandler(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);
  const result = await getDashboardItem(db, brand_id);
  return json(result);
}

/**
 * POST /api/customer/intelligence/impression/:id
 * Records that an intelligence item was displayed on the dashboard.
 * Calculates next eligible show time based on impression schedule.
 */
export async function recordImpressionHandler(request, env, auth) {
  const { brand_id } = auth;
  const itemId = request.url.split('/').pop();
  if (!itemId) return error("Item ID required", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const ok = await recordImpression(db, brand_id, itemId);
  return json({ success: ok });
}

/**
 * POST /api/customer/intelligence/acknowledge/:id
 * Marks an item as acknowledged — user has interacted with it.
 * Immediately stops further dashboard reminders for this item.
 * Triggered by: CTA click, save, add to plan, open details, dismiss.
 */
export async function acknowledgeHandler(request, env, auth) {
  const { brand_id } = auth;
  const itemId = request.url.split('/').pop();
  if (!itemId) return error("Item ID required", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const ok = await acknowledgeItem(db, brand_id, itemId);
  return json({ success: ok });
}

/**
 * POST /api/customer/intelligence/force-refresh
 * Bypasses the daily gate — for admin/testing only.
 */
export async function forceRefreshIntelligence(request, env, auth) {
  const { brand_id } = auth;
  const result = await runDailyIntelligence(env, brand_id, true);
  if (!result.generated) {
    return error(result.error || 'Generation failed', 'INTEL_ERROR', null, 500);
  }
  const db = getDB(env);
  const feed = await getIntelligenceFeed(db, brand_id);
  return json({ ...feed, just_generated: true });
}

/* ══════════════════════════════════════════════════════════════════════════
   AUDIT HANDLERS (unchanged)
   ══════════════════════════════════════════════════════════════════════════ */

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
  const quickWins = strategicAnalysis.filter(a => a.recommendation).slice(0, 3).map(a => a.recommendation);

  return json({
    id:                audit.id,
    brand_name:        audit.brand_name,
    website_url:       audit.website_url,
    overall_score:     audit.overall_score,
    industry:          audit.industry,
    preview_mode:      audit.preview_mode,
    created_at:        audit.created_at,
    score_breakdown:   safeJSON(audit.score_breakdown_json, {}),
    strategic_analysis: strategicAnalysis,
    next_steps:        nextSteps,
    goals:             safeJSON(audit.goals_json, []),
    platforms:         safeJSON(audit.platforms_json, []),
    benchmarks:        getBenchmarks(audit.industry),
    roadmap: {
      duration:    '12-Weeks',
      priorities:  nextSteps,
      quick_wins:  quickWins,
    },
  });
}
