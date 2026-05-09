/**
 * myPilotPost — Brand Scoring Engine
 * AGENCY-GRADE • WEIGHTED MODEL
 */

export const SCORING_WEIGHTS = {
  consistency: 0.30,
  platform_coverage: 0.30,
  content_quality: 0.20,
  growth_potential: 0.20
};

/**
 * Calculates a standardized 0-100 brand score
 * @param {Object} data - Normalized brand metrics
 * @returns {Object} { overall_score, breakdown }
 */
export function calculateBrandScore(data) {
  // Normalize components to 0-100
  const breakdown = {
    consistency: normalizeScore(data.post_frequency || 0, 0, 7), // 7 posts/week is max score
    platform_coverage: normalizeScore(data.platform_count || 0, 0, 5), // 5 platforms is max score
    content_quality: normalizeScore(data.engagement_rate || 0, 0, 0.05), // 5% engagement is max score
    growth_potential: normalizeScore(data.search_visibility || 0, 0, 1000) // 1000 imps/day is baseline
  };

  // Calculate Weighted Average
  const overall = (
    (breakdown.consistency * SCORING_WEIGHTS.consistency) +
    (breakdown.platform_coverage * SCORING_WEIGHTS.platform_coverage) +
    (breakdown.content_quality * SCORING_WEIGHTS.content_quality) +
    (breakdown.growth_potential * SCORING_WEIGHTS.growth_potential)
  );

  return {
    overall_score: Math.round(overall),
    breakdown
  };
}

function normalizeScore(val, min, max) {
  const score = ((val - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, Math.round(score)));
}
