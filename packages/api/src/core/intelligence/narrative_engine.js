/**
 * myPilotPost — Narrative Diagnosis Engine
 * STRATEGIC • CONSULTATIVE • OUTCOME-FOCUSED
 * 
 * Transforms raw scores and metrics into human, advisory-level strategic intelligence.
 */

import { CONFIDENCE_LEVELS } from "./confidence_engine.js";

/**
 * Generates the full narrative diagnosis and strategic framing for a brand audit.
 * @param {Object} scoreBreakdown - The dimensional scores.
 * @param {Array} weaknesses - Array of identified weakness keys.
 * @param {string} industry - The brand's industry.
 */
export function generateNarrativeDiagnosis(scoreBreakdown, weaknesses, industry = 'General') {
  return {
    executive_diagnosis: buildExecutiveDiagnosis(scoreBreakdown, weaknesses),
    strategic_priority_stack: buildStrategicPriorityStack(scoreBreakdown, weaknesses),
    expected_business_impact: buildExpectedBusinessImpact(weaknesses),
    high_performing_comparatives: buildComparatives(industry)
  };
}

function buildExecutiveDiagnosis(scores, weaknesses) {
  let primaryWeakness = "inconsistent content distribution";
  let consequence = "reducing customer trust and limiting audience growth";
  let opportunity = "visibility potential";

  if (weaknesses.includes('low_consistency')) {
    primaryWeakness = "irregular publishing cadences";
    consequence = "causing algorithm suppression and weakening brand recall";
    opportunity = "strong positioning potential";
  } else if (weaknesses.includes('low_engagement')) {
    primaryWeakness = "low-resonance content formats";
    consequence = "wasting audience reach without capturing meaningful intent";
    opportunity = "established baseline visibility";
  } else if (weaknesses.includes('platform_gap')) {
    primaryWeakness = "a fragmented platform presence";
    consequence = "leaving significant market share to more active competitors";
    opportunity = "untapped audience segments";
  }

  // Create a human, strategic narrative. No scores mentioned.
  return `Your brand has ${opportunity}, but ${primaryWeakness} is currently ${consequence}. By addressing these structural gaps, there is a clear strategic path to unlock measurable business growth.`;
}

function buildStrategicPriorityStack(scores, weaknesses) {
  const priorities = [];

  if (weaknesses.includes('low_consistency') || scores.consistency < 50) {
    priorities.push({
      priority_number: 1,
      title: "Restore Publishing Consistency",
      urgency: "HIGH",
      timeframe: "Immediate (Days 1-14)",
      execution_difficulty: "LOW",
      expected_outcome: "Recover baseline algorithmic reach and signal active presence to your audience."
    });
  }

  if (weaknesses.includes('low_engagement') || scores.engagement_quality < 50) {
    priorities.push({
      priority_number: 2,
      title: "Strengthen Content Resonance",
      urgency: "HIGH",
      timeframe: "Short-Term (Days 14-30)",
      execution_difficulty: "MEDIUM",
      expected_outcome: "Transition passive viewers into active community members, improving organic content distribution."
    });
  }

  if (weaknesses.includes('platform_gap') || scores.platform_authority < 50) {
    priorities.push({
      priority_number: 3,
      title: "Expand Platform Authority",
      urgency: "MEDIUM",
      timeframe: "Mid-Term (Days 30-60)",
      execution_difficulty: "HIGH",
      expected_outcome: "Capture whitespace in your niche and defend market share against competitors."
    });
  }

  // Fallback if no specific weaknesses triggered
  if (priorities.length === 0) {
    priorities.push({
      priority_number: 1,
      title: "Optimize Conversion Architecture",
      urgency: "MEDIUM",
      timeframe: "Ongoing",
      execution_difficulty: "MEDIUM",
      expected_outcome: "Ensure existing traffic converts more efficiently across all active channels."
    });
  }

  return priorities;
}

function buildExpectedBusinessImpact(weaknesses) {
  const impacts = [];

  if (weaknesses.includes('low_consistency')) {
    impacts.push("Improving posting consistency may increase profile visibility by 25-40% within 14–30 days.");
  }
  if (weaknesses.includes('low_engagement')) {
    impacts.push("Elevating engagement quality often correlates directly with increased inbound lead volume and trust.");
  }
  if (weaknesses.includes('platform_gap')) {
    impacts.push("Activating neglected platforms can open entirely new acquisition channels with high initial ROI.");
  }

  if (impacts.length === 0) {
    impacts.push("Strategic alignment of your content system typically yields higher conversion efficiency and lower acquisition costs.");
  }

  return impacts;
}

function buildComparatives(industry) {
  return {
    title: "What High-Performing Brands Do Differently",
    context: `In the ${industry} space, top-tier brands typically:`,
    bullet_points: [
      "Publish high-value educational content 3–5x per week.",
      "Maintain strict CTA continuity from social posts to landing pages.",
      "Mix founder-led thought leadership with strong social proof.",
      "Engage proactively with their community to trigger algorithmic amplification."
    ],
    confidence: CONFIDENCE_LEVELS.BENCHMARKED
  };
}
