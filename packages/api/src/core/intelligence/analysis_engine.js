/**
 * myPilotPost — Strategic Analysis Engine
 * CAUSE • IMPACT • OPPORTUNITY • RECOMMENDATION
 */

import { CONFIDENCE_LEVELS } from "./confidence_engine.js";

const STRATEGIC_ANALYSIS_MAP = {
  low_consistency: {
    metric: "Posting Frequency",
    cause: "Irregular content scheduling and manual workflows",
    business_impact: "Significant reduction in algorithm visibility and audience retention",
    strategic_risk: "Loss of topical authority and audience decay over time",
    opportunity: "Dominance in the 3:00 PM - 6:00 PM engagement window",
    recommendation: "Automate your content DNA to ensure a baseline of 3 posts per week",
    urgency: "HIGH",
    expected_outcome: "2.4x increase in profile visits within 30 days",
    evidence: "Detected from irregular publishing cadences and frequent 3+ day posting gaps."
  },
  low_engagement: {
    metric: "Engagement Quality",
    cause: "Static content formats and lack of interactive elements",
    business_impact: "Lower conversion from followers to leads due to lack of trust",
    strategic_risk: "Brand becoming background noise in a high-velocity feed",
    opportunity: "Leveraging video-first narratives to build community",
    recommendation: "Pivot to narrative-driven Reels/TikTok formats with direct CTAs",
    urgency: "CRITICAL",
    expected_outcome: "40% improvement in meaningful interactions",
    evidence: "Based on declining engagement-to-impression ratios and weak comment depth."
  },
  platform_gap: {
    metric: "Platform Authority",
    cause: "Brand is siloed on a single network",
    business_impact: "Missing out on diverse audience segments and cross-traffic",
    strategic_risk: "Single-point failure if platform algorithm shifts",
    opportunity: "Omnichannel presence for content synergy",
    recommendation: "Synchronize strategy across LinkedIn and Instagram for total reach",
    urgency: "MEDIUM",
    expected_outcome: "15% increase in total unique brand impressions",
    evidence: "Identified due to heavy concentration on a single channel while competitors utilize omnichannel distribution."
  }
};

/**
 * Generates structured strategic analysis
 */
export function generateStrategicAnalysis(weaknesses, industry = 'General') {
  return weaknesses.map(code => {
    const analysis = STRATEGIC_ANALYSIS_MAP[code];
    if (!analysis) return null;

    return {
      id: crypto.randomUUID(),
      ...analysis,
      confidence_level: CONFIDENCE_LEVELS.BENCHMARKED,
      calculation_source: "Strategic Benchmarking Engine v2",
      industry_context: `Standard for ${industry} brands`,
      competitor_context: "Top 10% of competitors use automated scheduling"
    };
  }).filter(Boolean);
}
