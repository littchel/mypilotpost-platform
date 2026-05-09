/**
 * myPilotPost — Opportunity Scoring Engine
 * EVIDENCE-BACKED • WEIGHTED • NO RANDOM PRIORITIES
 */

import { CONFIDENCE_LEVELS } from "./confidence_engine.js";

/**
 * Score an opportunity across 3 axes: Impact, Urgency, Confidence
 * Returns a combined priority value (0-100)
 */
export function scoreOpportunity(signals) {
  const impact = calculateImpactScore(signals);
  const urgency = calculateUrgencyScore(signals);
  const confidence = calculateConfidenceScore(signals);

  // Weighted: impact matters most, then urgency, then confidence
  const value = Math.round((impact * 0.45) + (urgency * 0.35) + (confidence * 0.20));

  return {
    impact_score: impact,
    urgency_score: urgency,
    confidence_score: confidence,
    opportunity_value: value,
    urgency_label: getUrgencyLabel(urgency),
    priority: getPriorityTier(value)
  };
}

function calculateImpactScore(signals) {
  let score = 30; // baseline

  // High-value signals raise impact
  if (signals.funnel_stage === 'decision') score += 25;
  if (signals.funnel_stage === 'consideration') score += 15;
  if (signals.strategic_goal === 'conversions') score += 20;
  if (signals.strategic_goal === 'leads') score += 15;
  if (signals.strategic_goal === 'authority') score += 10;
  if (signals.linked_to_revenue) score += 20;
  if (signals.competitor_gap) score += 10;

  return Math.min(100, score);
}

function calculateUrgencyScore(signals) {
  let score = 20; // baseline

  // Time-sensitive signals
  if (signals.engagement_dropping) score += 30;
  if (signals.posting_gap_days > 7) score += 25;
  if (signals.posting_gap_days > 3) score += 10;
  if (signals.competitor_outpacing) score += 20;
  if (signals.seo_opportunity_window) score += 15;
  if (signals.trend_active) score += 25;

  return Math.min(100, score);
}

function calculateConfidenceScore(signals) {
  let score = 0;

  // Confidence rises with evidence quality
  if (signals.source === 'measured_analytics') score += 40;
  if (signals.source === 'audit_intelligence') score += 35;
  if (signals.source === 'seo_data') score += 30;
  if (signals.source === 'competitor_benchmarked') score += 25;
  if (signals.source === 'dna_alignment') score += 20;
  if (signals.source === 'estimated') score += 10;

  // Supporting evidence
  if (signals.historical_performance_data) score += 20;
  if (signals.dna_aligned) score += 10;

  return Math.min(100, score);
}

function getUrgencyLabel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function getPriorityTier(value) {
  if (value >= 80) return 1;
  if (value >= 65) return 2;
  if (value >= 50) return 3;
  if (value >= 35) return 4;
  return 5;
}

/**
 * Explains the scoring rationale for transparency
 */
export function explainScore(signals, scores) {
  const reasons = [];
  if (signals.engagement_dropping) reasons.push("Engagement is declining — action is time-sensitive");
  if (signals.competitor_outpacing) reasons.push("Competitors are outpacing your posting cadence");
  if (signals.seo_opportunity_window) reasons.push("SEO keyword window is open in your niche");
  if (signals.source === 'measured_analytics') reasons.push("Based on your actual performance data");
  if (signals.dna_aligned) reasons.push("Aligned with your Brand DNA strategic goals");

  return {
    score_explanation: reasons,
    confidence_label: getConfidenceLabel(signals.source),
    value: scores.opportunity_value
  };
}

function getConfidenceLabel(source) {
  const map = {
    measured_analytics: CONFIDENCE_LEVELS.MEASURED,
    audit_intelligence: CONFIDENCE_LEVELS.BENCHMARKED,
    seo_data: CONFIDENCE_LEVELS.MEASURED,
    competitor_benchmarked: CONFIDENCE_LEVELS.BENCHMARKED,
    dna_alignment: CONFIDENCE_LEVELS.USER_SUPPLIED,
    estimated: CONFIDENCE_LEVELS.ESTIMATED
  };
  return map[source] || CONFIDENCE_LEVELS.ESTIMATED;
}
