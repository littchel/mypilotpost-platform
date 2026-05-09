/**
 * myPilotPost — Agency Report Builder (v2 Strategic)
 * SWOT • COMPETITOR • GENOME • ROADMAP • KPI PROJECTIONS
 */

import { CONFIDENCE_LEVELS } from "../intelligence/confidence_engine.js";

/**
 * Builds a full strategic audit report (10+ sections)
 */
export function buildAuditReport(brandData, scoreData, analysis, nextSteps, competitors = []) {
  const score = scoreData.overall_score;

  return {
    report_type: "Brand Audit Report",
    generated_at: new Date().toISOString(),
    methodology: scoreData.methodology || "Brand DNA Score™ — Weighted Multi-Dimensional Analysis",
    confidence: CONFIDENCE_LEVELS.BENCHMARKED,
    sections: [
      buildExecSummary(brandData, scoreData),
      buildScorecard(scoreData),
      buildSWOT(brandData, scoreData, analysis),
      buildContentGenome(analysis),
      buildCompetitorBenchmarking(competitors, scoreData),
      buildFunnelIntelligence(scoreData),
      buildConversionArchitecture(brandData, scoreData),
      buildExecutiveKPISummary(scoreData),
      buildStrategicRoadmap(nextSteps, scoreData),
      buildRevenueOpportunity(brandData, scoreData)
    ]
  };
}

function buildExecSummary(brand, score) {
  return {
    id: "exec_summary",
    title: "Executive Summary",
    editable: true,
    content: `${brand.brand_name || "Your brand"} holds a Brand DNA Score™ of ${score.overall_score}/100. ${getExecutiveNarrative(score)}`,
    confidence: CONFIDENCE_LEVELS.BENCHMARKED,
    kpi_highlights: {
      overall_score: score.overall_score,
      top_gap: getTopGap(score.breakdown),
      quick_win: "Optimize LinkedIn bio for keyword discoverability"
    }
  };
}

function buildScorecard(score) {
  return {
    id: "scorecard",
    title: "Brand DNA Score™ Breakdown",
    locked: false,
    data: score.breakdown,
    benchmarks: score.benchmarks,
    confidence_indicators: score.confidence_indicators,
    methodology: score.methodology
  };
}

function buildSWOT(brand, score, analysis) {
  const bd = score.breakdown || {};
  return {
    id: "swot",
    title: "SWOT Analysis",
    editable: true,
    strengths: [
      bd.consistency >= 60 ? "Consistent content publishing cadence" : null,
      bd.platform_authority >= 60 ? "Established platform authority" : null
    ].filter(Boolean),
    weaknesses: analysis.map(a => a.cause).filter(Boolean).slice(0, 3),
    opportunities: analysis.map(a => a.opportunity).filter(Boolean).slice(0, 3),
    threats: [
      "Competitors investing heavily in video-first content",
      "Algorithm changes reducing organic reach",
      "Audience attention fragmentation across platforms"
    ],
    confidence: CONFIDENCE_LEVELS.INFERRED
  };
}

function buildContentGenome(analysis) {
  return {
    id: "content_genome",
    title: "Content Genome Analysis",
    pillar_balance: "SKEWED — Over-indexed on promotional content",
    top_patterns: ["How-to educational", "Behind-the-scenes"],
    bottom_patterns: ["Case studies", "Social proof"],
    emotional_resonance: "MODERATE",
    format_effectiveness: {
      video: "HIGH",
      carousel: "MEDIUM",
      static: "LOW"
    },
    confidence: CONFIDENCE_LEVELS.ESTIMATED
  };
}

function buildCompetitorBenchmarking(competitors, score) {
  return {
    id: "competitor_benchmarking",
    title: "Competitor Benchmarking",
    your_score: score.overall_score,
    industry_avg: score.benchmarks?.avg_score || 55,
    top_10_pct: score.benchmarks?.top_10_percent || 85,
    gap_to_average: Math.max(0, (score.benchmarks?.avg_score || 55) - score.overall_score),
    competitors: competitors.length > 0 ? competitors : [
      { name: "Industry Leader", est_score: 82, confidence: CONFIDENCE_LEVELS.BENCHMARKED },
      { name: "Nearest Competitor", est_score: 61, confidence: CONFIDENCE_LEVELS.ESTIMATED }
    ],
    whitespace: "High-authority long-form video content in your niche",
    confidence: CONFIDENCE_LEVELS.BENCHMARKED
  };
}

function buildFunnelIntelligence(score) {
  const bd = score.breakdown || {};
  return {
    id: "funnel_intelligence",
    title: "Funnel Intelligence",
    top_of_funnel: bd.visibility >= 50 ? "HEALTHY" : "WEAK",
    middle_of_funnel: bd.engagement_quality >= 50 ? "MODERATE" : "LEAKING",
    bottom_of_funnel: bd.conversion_readiness >= 50 ? "OPTIMIZED" : "FRICTION-HEAVY",
    leakage_points: bd.conversion_readiness < 50 ? ["CTA clarity", "Link architecture"] : [],
    confidence: CONFIDENCE_LEVELS.INFERRED
  };
}

function buildConversionArchitecture(brand, score) {
  return {
    id: "conversion_architecture",
    title: "Conversion Architecture Review",
    cta_health: score.breakdown?.conversion_readiness >= 60 ? "STRONG" : "NEEDS WORK",
    link_ecosystem: brand.website_url ? "PRESENT" : "MISSING",
    social_commerce_readiness: "PARTIAL",
    recommended_cta_structure: "Lead with value → Social proof → Clear CTA → Single landing page",
    confidence: CONFIDENCE_LEVELS.INFERRED
  };
}

function buildExecutiveKPISummary(score) {
  const bd = score.breakdown || {};
  return {
    id: "executive_kpi",
    title: "Executive KPI Summary",
    kpis: [
      { label: "Brand DNA Score™", value: score.overall_score, target: 75, trend: "UP" },
      { label: "Visibility Index", value: bd.visibility || 0, target: 70, trend: "STABLE" },
      { label: "Engagement Quality", value: bd.engagement_quality || 0, target: 65, trend: "DOWN" },
      { label: "Conversion Readiness", value: bd.conversion_readiness || 0, target: 70, trend: "STABLE" }
    ],
    confidence: CONFIDENCE_LEVELS.MEASURED
  };
}

function buildStrategicRoadmap(nextSteps, score) {
  return {
    id: "strategic_roadmap",
    title: "12-Week Strategic Roadmap",
    editable: true,
    phases: [
      {
        weeks: "1-4",
        label: "Foundation",
        focus: "Fix visibility and consistency gaps",
        actions: nextSteps.slice(0, 2)
      },
      {
        weeks: "5-8",
        label: "Growth",
        focus: "Amplify engagement and platform authority",
        actions: nextSteps.slice(2, 4)
      },
      {
        weeks: "9-12",
        label: "Conversion",
        focus: "Optimize funnel architecture and CTA flow",
        actions: ["Launch lead magnet", "A/B test CTA messaging"]
      }
    ],
    kpi_projections: {
      score_target: Math.min(100, score.overall_score + 22),
      engagement_lift: "+35%",
      reach_growth: "+18%"
    },
    confidence: CONFIDENCE_LEVELS.BENCHMARKED
  };
}

function buildRevenueOpportunity(brand, score) {
  const gap = 75 - score.overall_score;
  return {
    id: "revenue_opportunity",
    title: "Revenue Opportunity Analysis",
    current_efficiency: score.overall_score < 50 ? "LOW" : "MODERATE",
    opportunity_score: Math.min(100, gap * 2),
    top_opportunities: [
      "Organic lead capture via LinkedIn content",
      "Referral loop through content sharing architecture",
      "Email list growth from gated brand reports"
    ],
    estimated_impact: "15-30% increase in organic lead volume within 90 days",
    confidence: CONFIDENCE_LEVELS.ESTIMATED
  };
}

function getTopGap(breakdown = {}) {
  const entries = Object.entries(breakdown);
  if (!entries.length) return "Consistency";
  return entries.sort((a, b) => a[1] - b[1])[0][0].replace(/_/g, " ");
}

function getExecutiveNarrative(score) {
  if (score.overall_score >= 80) return "Your brand is in a high-growth phase. Focus on scaling successful content patterns.";
  if (score.overall_score >= 50) return "You have a solid foundation but significant gaps remain in consistency and conversion readiness.";
  return "Critical foundational improvements are required before measurable growth can be achieved.";
}
