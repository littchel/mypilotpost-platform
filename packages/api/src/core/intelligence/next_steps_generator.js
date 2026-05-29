/**
 * myPilotPost — Next Steps Generator (v3 — Brand-Specific)
 * Generates tactical actions grounded in observed brand signals.
 */

export function generateNextSteps(scoreData, brandName = 'Your brand', industry = 'General', goals = [], platforms = []) {
  const steps = [];

  if (scoreData.consistency < 60) {
    steps.push(`Establish a fixed publishing schedule for ${brandName} — even 2–3 posts per week, consistently executed, builds the algorithm signals and audience recall that irregular posting cannot create.`);
  }

  if (scoreData.engagement_quality < 60) {
    steps.push(`Shift ${brandName}'s next 5 posts to lead with a specific question, outcome, or industry insight relevant to your ${industry} audience — test which format generates the most active responses.`);
  }

  if (scoreData.platform_authority < 50) {
    steps.push(`Identify the 1–2 platforms where ${industry} audiences are most concentrated and establish ${brandName}'s profile — even before publishing, securing the brand name on key platforms matters.`);
  }

  if (scoreData.conversion_readiness < 60) {
    steps.push(`Review ${brandName}'s social bios across all active channels — confirm each profile has a clear, consistent value proposition and a link to the primary conversion destination.`);
  }

  // Ensure at least 3 steps using goal-informed recommendations
  if (steps.length < 3) {
    if (goals.includes('thought_leadership')) {
      steps.push(`Develop a recurring content format for ${brandName} — a weekly insight, framework, or case study that gives the ${industry} audience a reliable reason to follow and return.`);
    } else if (goals.includes('lead_gen')) {
      steps.push(`Map ${brandName}'s social-to-conversion pathway: trace the step from each social post to the next logical action for a prospective ${industry} customer, and remove any friction in that journey.`);
    } else if (goals.includes('engagement')) {
      steps.push(`Test a direct question or community prompt in ${brandName}'s next post — engagement-focused content in ${industry} performs strongest when it invites audience participation rather than broadcasting.`);
    } else {
      steps.push(`Build a 2-week content calendar for ${brandName} with a defined format mix — this removes the blank-page barrier that causes most brands to publish inconsistently.`);
    }
  }

  return steps.slice(0, 4);
}
