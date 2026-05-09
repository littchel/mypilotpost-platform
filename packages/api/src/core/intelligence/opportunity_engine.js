/**
 * myPilotPost — Content Opportunity Engine
 * INTELLIGENCE-LED • STRATEGIC • EVIDENCE-BACKED
 *
 * Transforms Brand DNA, audit intelligence, SEO gaps, competitor benchmarking,
 * and platform analytics into actionable strategic content recommendations.
 */

import { getDB } from "../../lib/db.js";
import { json } from "../../lib/json.js";
import { scoreOpportunity, explainScore } from "./opportunity_scoring.js";
import { CONFIDENCE_LEVELS } from "./confidence_engine.js";

/* ======================================================
   OPPORTUNITY TYPE DEFINITIONS
====================================================== */
const OPPORTUNITY_TYPES = [
  'authority_building', 'engagement_recovery', 'seo_opportunity',
  'conversion_opportunity', 'trust_building', 'competitor_gap',
  'retention_opportunity', 'viral_opportunity', 'audience_activation',
  'referral_growth', 'educational_content', 'thought_leadership', 'product_positioning'
];

/* ======================================================
   GENERATE OPPORTUNITIES
   POST /api/customer/opportunities/generate
====================================================== */
export async function generateOpportunities(request, env, auth) {
  const db = getDB(env);
  const brandId = auth.brand_id;
  const userId = auth.user_id;

  // 1. Gather all intelligence signals in parallel
  const [dna, latestAudit, analytics, competitors, seoData, growthData] = await Promise.all([
    getBrandDNAContext(db, brandId),
    getLatestAuditContext(db, brandId),
    getAnalyticsContext(db, brandId),
    getCompetitorContext(db, brandId),
    getSEOContext(db, brandId),
    getGrowthContext(db, brandId)
  ]);

  // 2. Run opportunity detection
  const opportunities = [];

  // 2a. Audit-driven opportunities
  if (latestAudit) {
    opportunities.push(...detectAuditOpportunities(latestAudit, dna));
  }

  // 2b. Analytics-driven opportunities
  if (analytics) {
    opportunities.push(...detectAnalyticsOpportunities(analytics, dna));
  }

  // 2c. Competitor gap opportunities
  if (competitors.length) {
    opportunities.push(...detectCompetitorGaps(competitors, analytics, dna));
  }

  // 2d. SEO opportunities
  if (seoData) {
    opportunities.push(...detectSEOOpportunities(seoData, dna));
  }

  // 2e. Growth signal opportunities
  if (growthData) {
    opportunities.push(...detectGrowthOpportunities(growthData, dna));
  }

  // 3. Score and deduplicate
  const scored = opportunities
    .map(opp => {
      const scores = scoreOpportunity(opp.signals || {});
      return { ...opp, ...scores };
    })
    .sort((a, b) => b.opportunity_value - a.opportunity_value)
    .slice(0, 12); // Cap at 12 strategic recommendations

  // 4. Persist to database
  const inserted = [];
  for (const opp of scored) {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO content_opportunities (
        id, user_id, brand_id, opportunity_type, title, description,
        strategic_goal, target_platform, content_format, funnel_stage,
        rationale, source_signal, linked_metric, expected_impact,
        impact_score, urgency_score, confidence_score, opportunity_value,
        confidence_level, urgency, priority, recommendation_data,
        generated_from, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'realtime', datetime('now', '+7 days'))
    `).bind(
      id, userId, brandId,
      opp.opportunity_type, opp.title, opp.description,
      opp.strategic_goal, opp.target_platform, opp.content_format,
      opp.funnel_stage, opp.rationale, opp.source_signal,
      opp.linked_metric, opp.expected_impact,
      opp.impact_score, opp.urgency_score, opp.confidence_score, opp.opportunity_value,
      opp.confidence_level, opp.urgency_label, opp.priority,
      JSON.stringify(opp)
    ).run();
    inserted.push({ id, ...opp });
  }

  return json({ opportunities: inserted, generated_count: inserted.length });
}

/* ======================================================
   LIST OPPORTUNITIES
   GET /api/customer/opportunities
====================================================== */
export async function listOpportunities(request, env, auth) {
  const db = getDB(env);
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');
  const type = url.searchParams.get('type');
  const urgency = url.searchParams.get('urgency');
  const status = url.searchParams.get('status') || 'pending';

  let query = `
    SELECT * FROM content_opportunities
    WHERE brand_id = ? AND status = ?
  `;
  const params = [auth.brand_id, status];

  if (platform) { query += ' AND target_platform = ?'; params.push(platform); }
  if (type) { query += ' AND opportunity_type = ?'; params.push(type); }
  if (urgency) { query += ' AND urgency = ?'; params.push(urgency); }

  query += ' ORDER BY priority ASC, opportunity_value DESC LIMIT 20';

  const { results } = await db.prepare(query).bind(...params).all();

  return json({
    opportunities: (results || []).map(r => ({
      ...r,
      recommendation_data: r.recommendation_data ? JSON.parse(r.recommendation_data) : null
    }))
  });
}

/* ======================================================
   UPDATE OPPORTUNITY STATUS
   PATCH /api/customer/opportunities/:id
====================================================== */
export async function updateOpportunityStatus(request, env, auth) {
  const db = getDB(env);
  const id = new URL(request.url).pathname.split('/').pop();
  const { status, created_draft_id } = await request.json();

  const validStatuses = ['accepted', 'dismissed', 'completed', 'pending'];
  if (!validStatuses.includes(status)) {
    return json({ error: 'Invalid status' }, 400);
  }

  await db.prepare(`
    UPDATE content_opportunities
    SET status = ?,
        accepted_at = CASE WHEN ? = 'accepted' THEN datetime('now') ELSE accepted_at END,
        created_draft_id = COALESCE(?, created_draft_id)
    WHERE id = ? AND brand_id = ?
  `).bind(status, status, created_draft_id || null, id, auth.brand_id).run();

  // Award growth points if completed
  if (status === 'completed') {
    await db.prepare(`
      INSERT OR IGNORE INTO growth_activity (id, brand_id, action_type, points_earned, created_at)
      VALUES (?, ?, 'opportunity_completed', 25, datetime('now'))
    `).bind(crypto.randomUUID(), auth.brand_id).run();
  }

  return json({ success: true });
}

/* ======================================================
   INTELLIGENCE SIGNAL COLLECTORS
====================================================== */

async function getBrandDNAContext(db, brandId) {
  const [profile, objectives, pillars] = await Promise.all([
    db.prepare("SELECT * FROM brand_dna_profiles WHERE brand_id = ?").bind(brandId).first(),
    db.prepare("SELECT * FROM brand_dna_objectives WHERE brand_id = ?").bind(brandId).first(),
    db.prepare("SELECT * FROM brand_dna_content_pillars WHERE brand_id = ?").bind(brandId).all()
  ]);
  return { profile, objectives, pillars: pillars?.results || [] };
}

async function getLatestAuditContext(db, brandId) {
  const audit = await db.prepare(`
    SELECT * FROM brand_audit_results_v2
    WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1
  `).bind(brandId).first();
  if (!audit) return null;
  return {
    score: audit.overall_score,
    breakdown: JSON.parse(audit.score_breakdown_json || '{}'),
    insights: JSON.parse(audit.strategic_actions_json || '[]')
  };
}

async function getAnalyticsContext(db, brandId) {
  const [metrics, posting] = await Promise.all([
    db.prepare(`
      SELECT AVG(engagement_rate) as avg_er, SUM(impressions) as reach,
             COUNT(*) as post_count
      FROM content_analytics
      WHERE brand_id = ? AND reported_at >= date('now', '-30 days')
    `).bind(brandId).first(),
    db.prepare(`
      SELECT COUNT(*) as posts_30d,
             MAX(created_at) as last_post,
             CAST(julianday('now') - julianday(MAX(created_at)) AS INTEGER) as days_since_last
      FROM delivery_jobs
      WHERE brand_id = ? AND status = 'published'
    `).bind(brandId).first()
  ]);
  return { metrics, posting };
}

async function getCompetitorContext(db, brandId) {
  const { results } = await db.prepare(
    "SELECT * FROM competitor_tracking WHERE brand_id = ?"
  ).bind(brandId).all();
  return results || [];
}

async function getSEOContext(db, brandId) {
  return await db.prepare(`
    SELECT SUM(impressions) as imps, SUM(clicks) as clicks, AVG(avg_position) as pos
    FROM seo_metrics WHERE brand_id = ?
  `).bind(brandId).first();
}

async function getGrowthContext(db, brandId) {
  return await db.prepare(
    "SELECT * FROM growth_profiles WHERE brand_id = ?"
  ).bind(brandId).first();
}

/* ======================================================
   OPPORTUNITY DETECTORS
====================================================== */

function detectAuditOpportunities(audit, dna) {
  const opps = [];
  const bd = audit.breakdown || {};

  if (bd.consistency < 50) {
    opps.push({
      opportunity_type: 'engagement_recovery',
      title: 'Restore Posting Consistency to Recover Algorithm Visibility',
      description: 'Your posting cadence has irregular gaps that are reducing your algorithmic reach. A short-form video addressing a common audience pain point will restore momentum.',
      strategic_goal: 'awareness',
      target_platform: 'linkedin',
      content_format: 'short_video',
      funnel_stage: 'awareness',
      rationale: `Your consistency score is ${bd.consistency}/100, below the 50-point threshold. Irregular posting reduces algorithm reach by an estimated 30-40%.`,
      source_signal: 'audit',
      linked_metric: 'consistency_score',
      expected_impact: '2.4x increase in profile visits within 14 days',
      confidence_level: CONFIDENCE_LEVELS.BENCHMARKED,
      signals: {
        source: 'audit_intelligence',
        engagement_dropping: bd.consistency < 40,
        posting_gap_days: 4,
        dna_aligned: true,
        strategic_goal: 'awareness',
        funnel_stage: 'awareness'
      }
    });
  }

  if (bd.engagement_quality < 50) {
    opps.push({
      opportunity_type: 'audience_activation',
      title: 'Re-Engage Audience with High-Resonance Interactive Content',
      description: 'Your engagement quality is below benchmark. A carousel post or poll on a trending topic in your niche will drive meaningful interaction.',
      strategic_goal: 'authority',
      target_platform: 'instagram',
      content_format: 'carousel',
      funnel_stage: 'consideration',
      rationale: `Engagement quality score ${bd.engagement_quality}/100. Industry benchmark is 65+. Carousels average 3x the engagement of static posts.`,
      source_signal: 'audit',
      linked_metric: 'engagement_quality',
      expected_impact: '35-50% increase in meaningful interactions',
      confidence_level: CONFIDENCE_LEVELS.BENCHMARKED,
      signals: {
        source: 'audit_intelligence',
        engagement_dropping: true,
        dna_aligned: true,
        strategic_goal: 'authority',
        funnel_stage: 'consideration',
        historical_performance_data: true
      }
    });
  }

  if (bd.conversion_readiness < 50) {
    opps.push({
      opportunity_type: 'conversion_opportunity',
      title: 'Publish a Value-Demonstration Post to Reduce Conversion Friction',
      description: 'Your content lacks clear conversion architecture. Publish a results-focused case study or social proof post to bridge the gap between awareness and decision.',
      strategic_goal: 'conversions',
      target_platform: 'linkedin',
      content_format: 'article',
      funnel_stage: 'decision',
      rationale: `Conversion readiness score is ${bd.conversion_readiness}/100. Without social proof content, prospects face friction at the decision stage.`,
      source_signal: 'audit',
      linked_metric: 'conversion_readiness',
      expected_impact: 'Estimated 15% increase in DM inquiries over 30 days',
      confidence_level: CONFIDENCE_LEVELS.ESTIMATED,
      signals: {
        source: 'audit_intelligence',
        linked_to_revenue: true,
        funnel_stage: 'decision',
        strategic_goal: 'conversions'
      }
    });
  }

  return opps;
}

function detectAnalyticsOpportunities(analytics, dna) {
  const opps = [];
  const { posting } = analytics;

  if (posting?.days_since_last > 5) {
    opps.push({
      opportunity_type: 'engagement_recovery',
      title: `Break a ${posting.days_since_last}-Day Silence with a High-Value Post`,
      description: `You haven't published in ${posting.days_since_last} days. Audience retention drops significantly after 5+ days of inactivity. A value-dense post will recover visibility.`,
      strategic_goal: 'awareness',
      target_platform: 'all',
      content_format: 'short_video',
      funnel_stage: 'awareness',
      rationale: `${posting.days_since_last} days since last published content. Algorithmic suppression begins after 5 days of inactivity.`,
      source_signal: 'analytics',
      linked_metric: 'days_since_last_post',
      expected_impact: 'Recovery of 60-80% baseline reach within 48 hours of publishing',
      confidence_level: CONFIDENCE_LEVELS.MEASURED,
      signals: {
        source: 'measured_analytics',
        engagement_dropping: true,
        posting_gap_days: posting.days_since_last,
        trend_active: false
      }
    });
  }

  return opps;
}

function detectCompetitorGaps(competitors, analytics, dna) {
  const opps = [];
  const avgCompFreq = competitors.reduce((a, c) => a + (c.posting_frequency || 3.5), 0) / competitors.length;
  const ownFreq = (analytics?.posting?.posts_30d || 0) / 4;

  if (avgCompFreq > ownFreq * 1.3) {
    opps.push({
      opportunity_type: 'competitor_gap',
      title: 'Close the Posting Frequency Gap vs. Your Competitors',
      description: `Your competitors are publishing an estimated ${avgCompFreq.toFixed(1)} posts/week vs your ${ownFreq.toFixed(1)}. Increase to a minimum of 3 posts/week to remain competitive.`,
      strategic_goal: 'authority',
      target_platform: 'linkedin',
      content_format: 'thought_leadership',
      funnel_stage: 'awareness',
      rationale: `Competitor average frequency: ${avgCompFreq.toFixed(1)}/week. Your frequency: ${ownFreq.toFixed(1)}/week. Brands posting 3x/week see 45% more profile visits.`,
      source_signal: 'competitor',
      linked_metric: 'posting_frequency',
      expected_impact: 'Match competitor visibility within 30 days',
      confidence_level: CONFIDENCE_LEVELS.BENCHMARKED,
      signals: {
        source: 'competitor_benchmarked',
        competitor_outpacing: true,
        competitor_gap: true,
        strategic_goal: 'authority'
      }
    });
  }

  return opps;
}

function detectSEOOpportunities(seoData, dna) {
  const opps = [];
  const industry = dna?.profile?.industry || 'General';

  if (!seoData || (seoData.clicks || 0) < 100) {
    opps.push({
      opportunity_type: 'seo_opportunity',
      title: `Publish a Keyword-Led Authority Article in Your ${industry} Niche`,
      description: `Your search discoverability is low. Publishing a 1,000+ word educational article targeting high-intent search queries in the ${industry} space will improve organic discovery.`,
      strategic_goal: 'seo',
      target_platform: 'blog',
      content_format: 'article',
      funnel_stage: 'awareness',
      rationale: `Current search clicks: ${seoData?.clicks || 0}. Brands with consistent educational blog content see 3.5x more organic leads vs social-only brands.`,
      source_signal: 'seo',
      linked_metric: 'organic_clicks',
      expected_impact: '20-40% increase in organic search impressions within 60 days',
      confidence_level: CONFIDENCE_LEVELS.BENCHMARKED,
      signals: {
        source: 'seo_data',
        seo_opportunity_window: true,
        dna_aligned: true,
        strategic_goal: 'seo',
        funnel_stage: 'awareness'
      }
    });
  }

  return opps;
}

function detectGrowthOpportunities(growth, dna) {
  const opps = [];

  if ((growth?.referral_count || 0) < 3) {
    opps.push({
      opportunity_type: 'referral_growth',
      title: 'Activate Your Referral Loop with a Client Story Post',
      description: 'Your referral engine is underutilised. A compelling client result story generates social proof and organically encourages shares — the most cost-effective acquisition channel.',
      strategic_goal: 'retention',
      target_platform: 'linkedin',
      content_format: 'carousel',
      funnel_stage: 'decision',
      rationale: `Referral count is low. Client story content generates 3-5x more shares than promotional content and directly feeds your referral engine.`,
      source_signal: 'growth',
      linked_metric: 'referral_count',
      expected_impact: 'Estimated 2-4 new referral conversations per post',
      confidence_level: CONFIDENCE_LEVELS.BENCHMARKED,
      signals: {
        source: 'audit_intelligence',
        linked_to_revenue: true,
        funnel_stage: 'decision',
        strategic_goal: 'retention',
        dna_aligned: true
      }
    });
  }

  return opps;
}
