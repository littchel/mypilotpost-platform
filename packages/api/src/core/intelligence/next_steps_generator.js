/**
 * myPilotPost — Next Steps Generator
 * ACTIONABLE • TACTICAL • STRATEGIC
 */

/**
 * Generates tactical next steps based on audit results
 * @param {Object} scoreData - Brand score breakdown
 * @returns {Array} List of actionable next steps
 */
export function generateNextSteps(scoreData) {
  const steps = [];

  if (scoreData.consistency < 60) {
    steps.push("Establish a 30-day content calendar using the myPilotPost Scheduling Engine");
  }
  
  if (scoreData.content_quality < 60) {
    steps.push("Integrate Canva for high-impact visual design in every social post");
  }

  if (scoreData.platform_coverage < 50) {
    steps.push("Connect at least 2 additional social platforms to expand brand footprint");
  }

  if (scoreData.growth_potential < 50) {
    steps.push("Enable the Referral Engine to drive organic acquisition via user advocacy");
  }

  // Default strategic steps
  if (steps.length < 3) {
    steps.push("Review weekly Brand Intelligence insights for performance optimization");
    steps.push("Share automated reports with stakeholders to demonstrate ROI");
  }

  return steps.slice(0, 4);
}
