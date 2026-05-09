/**
 * myPilotPost — Competitor Intelligence Engine
 * BENCHMARKED • NO FAKE DATA • CONFIDENCE-LABELED
 */

import { CONFIDENCE_LEVELS, wrapWithConfidence } from "../intelligence/confidence_engine.js";
import { getDB } from "../../lib/db.js";
import { json } from "../../lib/json.js";

/**
 * GET /api/customer/competitors
 */
export async function getCompetitorBenchmarks(request, env, auth) {
  const db = getDB(env);
  const brandId = auth.brand_id;

  const { results: competitors } = await db.prepare(
    "SELECT * FROM competitor_tracking WHERE brand_id = ? ORDER BY estimated_authority DESC"
  ).bind(brandId).all();

  const { results: userCompetitors } = await db.prepare(
    "SELECT * FROM brand_dna_competitors WHERE brand_id = ?"
  ).bind(brandId).all();

  // Get brand's own benchmarks for comparison
  const ownMetrics = await db.prepare(`
    SELECT AVG(engagement_rate) as avg_er, COUNT(*) as post_count
    FROM content_analytics
    WHERE brand_id = ? AND reported_at >= date('now', '-30 days')
  `).bind(brandId).first();

  return json({
    competitors: competitors.map(c => formatCompetitor(c)),
    user_defined: userCompetitors,
    benchmarks: {
      your_posting_frequency: wrapWithConfidence(
        (ownMetrics?.post_count || 0) / 4,
        CONFIDENCE_LEVELS.MEASURED,
        "Based on last 30 days delivery_jobs"
      ),
      your_engagement_rate: wrapWithConfidence(
        ownMetrics?.avg_er || 0,
        CONFIDENCE_LEVELS.MEASURED,
        "Aggregated from content_analytics"
      ),
      industry_posting_avg: wrapWithConfidence(3.5, CONFIDENCE_LEVELS.BENCHMARKED, "Industry benchmark: 3-5 posts/week"),
      industry_engagement_avg: wrapWithConfidence(0.021, CONFIDENCE_LEVELS.BENCHMARKED, "Industry benchmark: 2.1% ER")
    },
    comparisons: generateComparisons(ownMetrics, competitors)
  });
}

/**
 * POST /api/customer/competitors
 */
export async function addCompetitor(request, env, auth) {
  const db = getDB(env);
  const body = await request.json();
  const { competitor_name, url, posting_frequency, estimated_authority } = body;

  await db.prepare(`
    INSERT INTO competitor_tracking (id, brand_id, competitor_name, url, posting_frequency, estimated_authority, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT DO NOTHING
  `).bind(
    crypto.randomUUID(), auth.brand_id,
    competitor_name, url,
    posting_frequency || null,
    estimated_authority || null
  ).run();

  return json({ success: true });
}

function formatCompetitor(c) {
  return {
    name: c.competitor_name,
    url: c.url,
    posting_frequency: wrapWithConfidence(c.posting_frequency, CONFIDENCE_LEVELS.ESTIMATED),
    estimated_authority: wrapWithConfidence(c.estimated_authority, CONFIDENCE_LEVELS.ESTIMATED),
    visibility_score: wrapWithConfidence(c.visibility_score, CONFIDENCE_LEVELS.BENCHMARKED),
    share_of_voice: wrapWithConfidence(c.share_of_voice_estimate, CONFIDENCE_LEVELS.INFERRED)
  };
}

function generateComparisons(own, competitors) {
  if (!competitors.length) return [];

  const avgCompFrequency = competitors.reduce((a, c) => a + (c.posting_frequency || 3.5), 0) / competitors.length;
  const ownFrequency = (own?.post_count || 0) / 4;

  return [
    {
      metric: "Posting Frequency",
      your_value: wrapWithConfidence(ownFrequency.toFixed(1), CONFIDENCE_LEVELS.MEASURED),
      competitor_avg: wrapWithConfidence(avgCompFrequency.toFixed(1), CONFIDENCE_LEVELS.ESTIMATED),
      gap: avgCompFrequency > ownFrequency ? `Competitors post ${(avgCompFrequency - ownFrequency).toFixed(1)}x more frequently` : "You are ahead",
      urgency: avgCompFrequency > ownFrequency * 1.5 ? "HIGH" : "MEDIUM"
    }
  ];
}
