/**
 * myPilotPost — Narrative Diagnosis Engine (v3 — Brand-Specific)
 * Transforms observed signals into strategic, brand-named intelligence.
 */

import { CONFIDENCE_LEVELS } from "./confidence_engine.js";

export function generateNarrativeDiagnosis(scoreBreakdown, weaknesses, industry = 'General', brandName = 'Your brand') {
  return {
    executive_diagnosis: buildExecutiveDiagnosis(scoreBreakdown, weaknesses, industry, brandName),
    strategic_priority_stack: buildStrategicPriorityStack(scoreBreakdown, weaknesses, industry, brandName),
    expected_business_impact: buildExpectedBusinessImpact(weaknesses, industry, brandName),
    high_performing_comparatives: buildComparatives(industry, brandName),
    strategic_roadmap: buildStrategicRoadmap(weaknesses, industry, brandName)
  };
}

function buildExecutiveDiagnosis(scores, weaknesses, industry, brandName) {
  const INDUSTRY_DESC = {
    'SaaS / Software':       'the B2B software market',
    'Fintech':               'the financial services sector',
    'AI & Machine Learning': 'the AI and technology landscape',
    'E-commerce':            'the e-commerce space',
    'Real Estate':           'the property market',
    'Consulting / B2B':      'the B2B consulting space',
    'Healthcare':            'the healthcare sector',
    'Education':             'the education market',
    'Retail / Fashion':      'the retail and fashion market',
    'Food & Beverage':       'the food and beverage industry',
    'Travel & Hospitality':  'the travel and hospitality sector',
    'Fitness & Wellness':    'the fitness and wellness space',
  };

  const industryDesc = INDUSTRY_DESC[industry] || `the ${industry} market`;
  const hasC = weaknesses.includes('low_consistency');
  const hasE = weaknesses.includes('low_engagement');
  const hasP = weaknesses.includes('platform_gap');

  if (hasC && hasE) {
    return `${brandName} operates in ${industryDesc} — a space where content consistency and audience relevance are primary trust signals. Based on publicly observable brand signals, ${brandName} has not yet established the publishing regularity or content-audience fit needed to build a compounding social presence. The strategic opportunity is clear: ${brandName} can accelerate growth significantly by combining a structured publishing cadence with content formats that reflect what ${industry} audiences actually engage with.`;
  }
  if (hasC && hasP) {
    return `${brandName} operates in ${industryDesc} with a concentrated platform presence. Based on observable brand signals, ${brandName}'s current social strategy is limited in both publishing regularity and platform reach — two factors that, when addressed together, typically drive compounding improvements in brand discovery and audience growth.`;
  }
  if (hasE && hasP) {
    return `${brandName} is active in ${industryDesc}, but the current content strategy may not yet reflect the formats and platform distribution that ${industry} audiences respond to most strongly. By aligning content with the specific engagement patterns of the ${industry} sector and expanding platform presence, ${brandName} has a clear path to building a more impactful social brand.`;
  }
  if (hasC) {
    return `${brandName} operates in ${industryDesc} with an established brand presence. The primary opportunity identified is publishing consistency — a foundational signal that influences how audiences and platforms perceive brand credibility in ${industry}. Establishing a reliable content cadence is the highest-leverage next step for ${brandName}.`;
  }
  if (hasE) {
    return `${brandName} has established a presence in ${industryDesc}, and the next growth lever is content-audience fit. ${brandName} can improve meaningful engagement by shifting toward the content formats and topics that ${industry} audiences most actively respond to — moving from visibility to genuine community connection.`;
  }
  if (hasP) {
    return `${brandName} is building its presence in ${industryDesc} from an established single-platform base. The strategic opportunity is in expanding platform distribution — reaching ${industry} audiences across the additional channels where they discover and evaluate brands in this space.`;
  }
  return `${brandName} operates in ${industryDesc} with a brand presence that shows positive indicators across key dimensions. The opportunity at this stage is to move from a functional social presence to a strategic one — using content consistently, purposefully, and in alignment with the specific dynamics of the ${industry} market.`;
}

function buildStrategicPriorityStack(scores, weaknesses, industry, brandName) {
  const priorities = [];
  let num = 1;

  if (weaknesses.includes('low_consistency') || scores.consistency < 50) {
    priorities.push({
      priority_number: num++,
      title: `Establish Publishing Consistency for ${brandName}`,
      urgency: "HIGH",
      timeframe: "Immediate (Days 1–14)",
      execution_difficulty: "LOW",
      expected_outcome: `Consistent publishing signals active brand presence to ${industry} audiences and creates the foundation for sustained algorithm-friendly content distribution.`
    });
  }

  if (weaknesses.includes('low_engagement') || scores.engagement_quality < 50) {
    priorities.push({
      priority_number: num++,
      title: `Align ${brandName}'s Content with ${industry} Audience Expectations`,
      urgency: "HIGH",
      timeframe: "Short-Term (Days 14–30)",
      execution_difficulty: "MEDIUM",
      expected_outcome: `Shifting to ${industry}-relevant content formats moves ${brandName}'s audience from passive observers to active participants — a prerequisite for meaningful conversion.`
    });
  }

  if (weaknesses.includes('platform_gap') || scores.platform_authority < 50) {
    priorities.push({
      priority_number: num++,
      title: `Expand ${brandName}'s Platform Reach`,
      urgency: "MEDIUM",
      timeframe: "Mid-Term (Days 30–60)",
      execution_difficulty: "HIGH",
      expected_outcome: `Adding strategically relevant platforms gives ${brandName} access to ${industry} audience segments not reachable on the current channel mix.`
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      priority_number: 1,
      title: `Optimise ${brandName}'s Conversion Architecture`,
      urgency: "MEDIUM",
      timeframe: "Ongoing",
      execution_difficulty: "MEDIUM",
      expected_outcome: `Ensuring ${brandName}'s social content consistently drives toward clear conversion actions improves the business ROI of existing social activity.`
    });
  }

  return priorities;
}

function buildExpectedBusinessImpact(weaknesses, industry, brandName) {
  const impacts = [];

  if (weaknesses.includes('low_consistency')) {
    impacts.push(`Improving ${brandName}'s publishing consistency can increase profile discovery rates and audience retention within 30 days — the compounding effect of regular content is one of the most reliable growth levers in ${industry}. (Estimated from industry benchmarking)`);
  }
  if (weaknesses.includes('low_engagement')) {
    impacts.push(`Shifting ${brandName}'s content toward ${industry}-relevant formats typically correlates with higher inbound enquiry volume, as audiences move from passive observation to active brand interest. (Inferred from industry engagement patterns)`);
  }
  if (weaknesses.includes('platform_gap')) {
    impacts.push(`Expanding ${brandName}'s platform presence opens acquisition channels with high initial discovery potential, particularly where ${industry} audiences are most concentrated. (Estimated from platform audience data)`);
  }

  if (impacts.length === 0) {
    impacts.push(`Strategic alignment of ${brandName}'s content system with ${industry} audience expectations typically yields higher conversion efficiency and lower audience acquisition costs over time. (Inferred from industry benchmarking)`);
  }

  return impacts;
}

function buildComparatives(industry, brandName) {
  const COMPARATIVES = {
    'SaaS / Software': {
      context: `In the B2B software space, top-performing brands use content as a product demonstration — showing outcomes, not features.`,
      points: [
        "Publish customer success content that quantifies business outcomes, not product capabilities.",
        "Use LinkedIn as a primary channel for founder and team thought leadership.",
        "Produce technical content that demonstrates product depth for evaluation-stage buyers.",
        "Maintain consistent publishing schedules that signal operational stability — a proxy for product reliability."
      ]
    },
    'Fintech': {
      context: `In financial services, top-performing brands consistently lead with education and simplification rather than product promotion.`,
      points: [
        "Publish plain-language financial education that reduces complexity and anxiety for their audience.",
        "Use consistent voice and positioning to build the trust that financial decisions require.",
        "Combine regulatory accuracy with accessible explanations that feel human rather than institutional.",
        "Create content that positions the brand as a guide rather than a product — trust precedes transactions in fintech."
      ]
    },
    'AI & Machine Learning': {
      context: `In the AI space, top-performing brands bridge the gap between technical capability and practical business impact.`,
      points: [
        "Publish accessible explainers that translate AI complexity into tangible business value.",
        "Lead with real-world applications and case studies rather than technical architecture.",
        "Maintain an active presence on LinkedIn and Twitter/X where AI communities concentrate.",
        "Position the team as accessible experts — not just product builders."
      ]
    },
    'E-commerce': {
      context: `In e-commerce, top-performing brands use social media as a discovery and community engine, not just a promotional channel.`,
      points: [
        "Publish lifestyle content that positions products within aspirational contexts.",
        "Leverage user-generated content and customer social proof as primary trust signals.",
        "Use short-form video natively on Instagram and TikTok for high-reach product discovery.",
        "Build community content that extends brand interaction beyond the purchase transaction."
      ]
    },
    'Real Estate': {
      context: `In real estate, top-performing brands build local authority through consistent market insight content rather than listing announcements.`,
      points: [
        "Publish local market observations and buyer/seller guidance — not just listings.",
        "Use video walkthroughs and behind-the-scenes content to build authenticity and trust.",
        "Maintain consistent community presence on Facebook for local audience reach.",
        "Position the team's expertise as the primary value proposition — not individual properties."
      ]
    },
    'Consulting / B2B': {
      context: `In B2B consulting, top-performing brands generate intellectual property from existing client work and publish it as accessible public content.`,
      points: [
        "Package strategic thinking into frameworks, models, and structured guides — not just case studies.",
        "Publish consistently on LinkedIn where B2B buyers actively research solutions.",
        "Lead with intellectual generosity — sharing expertise without a pitch builds trust faster than promotional content.",
        "Use content to demonstrate methodology and depth of thinking, not just credentials."
      ]
    },
    'Healthcare': {
      context: `In healthcare, top-performing brands build authority through trusted, evidence-based educational content that addresses real patient concerns.`,
      points: [
        "Publish patient education content that answers the specific questions people ask before booking.",
        "Maintain a warm, approachable tone that makes clinical topics feel accessible.",
        "Use consistent publishing to build the perceived reliability that healthcare audiences use as a trust proxy.",
        "Combine clinical accuracy with human empathy in every content piece."
      ]
    },
    'Education': {
      context: `In education, top-performing brands use content to demonstrate learning outcomes and reduce enrolment hesitancy.`,
      points: [
        "Lead with student success stories that make outcomes tangible and credible.",
        "Publish micro-learning content that delivers immediate value and demonstrates teaching quality.",
        "Use YouTube and TikTok for discovery-stage awareness, leading audiences toward the enrolment decision.",
        "Build community around learning outcomes — not institutional credentials."
      ]
    },
    'Retail / Fashion': {
      context: `In retail and fashion, top-performing brands use platform-native formats to drive discovery and active trend participation.`,
      points: [
        "Publish short-form video (Reels, TikTok) as the primary content format — it consistently outperforms static imagery for discovery.",
        "Respond to trends rapidly — trend participation is a primary engagement driver in fashion.",
        "Use creator-style production to build authenticity and reduce the distance between brand and consumer.",
        "Build community content around styling, use cases, and customer expression — not product promotion alone."
      ]
    },
    'Food & Beverage': {
      context: `In food and beverage, top-performing brands build emotional connection through process and provenance storytelling.`,
      points: [
        "Publish behind-the-scenes content showing how products are made, sourced, or crafted.",
        "Use short-form video to show products in natural, appetising context rather than studio photography.",
        "Build community through recipe sharing, use cases, and customer-generated content.",
        "Connect product to place, people, and purpose — the story behind the food consistently outperforms the food itself."
      ]
    },
    'Travel & Hospitality': {
      context: `In travel and hospitality, top-performing brands lead with aspirational experience content rather than availability and pricing.`,
      points: [
        "Prioritise destination storytelling and experience-led content over promotional offers.",
        "Use short-form video to evoke the emotional experience of travel — the primary purchase trigger.",
        "Publish local insider content that positions the brand as a trusted guide rather than a transaction.",
        "Build community content that extends the brand relationship before and after the trip itself."
      ]
    },
    'Fitness & Wellness': {
      context: `In fitness and wellness, top-performing brands build loyalty through authentic transformation content and expert-led education.`,
      points: [
        "Publish real transformation content with genuine outcome contexts — authenticity is the primary trust signal.",
        "Lead with expert-driven educational content that builds authority in the wellness niche.",
        "Use testimonials and community outcomes rather than product claims as the primary social proof format.",
        "Build community content that positions the brand as part of the audience's lifestyle — not just a product they buy."
      ]
    }
  };

  const comp = COMPARATIVES[industry] || {
    context: `In the ${industry} space, high-performing brands use content to build authority, trust, and audience relationships that convert.`,
    points: [
      "Publish consistently to maintain algorithmic visibility and audience recall.",
      "Lead with value-first content that addresses the specific questions of their target audience.",
      "Use platform-native formats to maximise reach and engagement.",
      "Connect content to clear business objectives and conversion pathways."
    ]
  };

  return {
    title: `What High-Performing ${industry} Brands Do Differently`,
    context: comp.context,
    bullet_points: comp.points,
    confidence: CONFIDENCE_LEVELS.BENCHMARKED
  };
}

function buildStrategicRoadmap(weaknesses, industry, brandName) {
  const quickWins = [];
  const growthPlays = [];
  const strategicInvestments = [];

  // Quick Wins — under 7 days
  if (weaknesses.includes('low_consistency')) {
    quickWins.push(`Map out ${brandName}'s next 4 weeks of content in a simple calendar — even 2 posts per week, planned in advance, creates the consistency foundation that matters for ${industry} audiences.`);
  }
  if (weaknesses.includes('low_engagement')) {
    quickWins.push(`Rewrite ${brandName}'s next 3 planned posts to lead with a question, a specific outcome, or an industry insight — not a product or service feature. Test the engagement difference directly.`);
  }
  if (weaknesses.includes('platform_gap')) {
    quickWins.push(`Identify one additional platform where ${industry} audiences are active and claim ${brandName}'s profile this week — even without posting immediately, securing the profile matters.`);
  }
  if (quickWins.length < 2) {
    quickWins.push(`Audit ${brandName}'s existing social profiles for bio consistency — confirm the value proposition, brand name, and website URL are aligned across all active channels.`);
  }

  // Growth Plays — 30 days
  if (weaknesses.includes('low_engagement')) {
    growthPlays.push(`Develop a ${industry}-specific content series for ${brandName} — a recurring format (weekly insight, question, or case study) that gives the audience a reason to return each week.`);
  }
  if (weaknesses.includes('low_consistency')) {
    growthPlays.push(`Build a 30-post content bank for ${brandName} using the content pillars identified from your goals — having posts in reserve eliminates the blank-page barrier that causes publishing gaps.`);
  }
  if (weaknesses.includes('platform_gap')) {
    growthPlays.push(`Launch ${brandName}'s presence on one new ${industry}-relevant platform within 30 days — repurpose 3 existing posts to reduce production effort while testing platform-audience fit.`);
  }
  if (growthPlays.length < 2) {
    growthPlays.push(`Set a 30-day publishing goal for ${brandName} with a defined format mix — educational, social proof, and community content — and measure which format earns the strongest response from the ${industry} audience.`);
  }

  // Strategic Investments — 60–90 days
  const STRATEGIC_BY_INDUSTRY = {
    'SaaS / Software':       `Build a LinkedIn thought leadership programme for ${brandName}'s founding team or product leads — personal authority from recognisable individuals accelerates B2B trust faster than brand-only publishing.`,
    'Fintech':               `Develop a ${brandName} financial education content series — a recurring format that demystifies a specific concept for your audience and positions ${brandName} as the most accessible and trustworthy voice in your niche.`,
    'AI & Machine Learning': `Launch a ${brandName} explainer content series translating AI capability into practical business applications — this builds the accessible authority position that most AI brands leave unclaimed.`,
    'E-commerce':            `Develop a ${brandName} user-generated content programme — systematically collecting and publishing customer content as primary social proof, which consistently outperforms brand-produced content in e-commerce discovery.`,
    'Real Estate':           `Build ${brandName}'s local market authority through a recurring market insight series — monthly or quarterly commentary on local trends positions ${brandName} as the most informed agent in the area.`,
    'Consulting / B2B':      `Package ${brandName}'s strategic methodology into a publicly published framework — a named model or structured approach that becomes the intellectual signature of your practice and generates inbound interest organically.`,
    'Healthcare':            `Develop ${brandName}'s patient education content library — a structured set of answers to the 20 most common questions your patients ask before making contact, published as a consistent, trusted resource.`,
    'Education':             `Build ${brandName}'s student outcome content programme — systematically capturing and publishing transformation stories that demonstrate the real-world impact of your education offering on enrolment-stage prospects.`,
    'Retail / Fashion':      `Develop ${brandName}'s creator content strategy — identify 3–5 micro-creators in your niche for co-created content, giving ${brandName} access to established audiences through authentic peer recommendation.`,
    'Food & Beverage':       `Build ${brandName}'s provenance and process content series — a sustained storytelling campaign around the people, places, and craft behind the product that differentiates ${brandName} from commodity alternatives.`,
    'Travel & Hospitality':  `Develop ${brandName}'s experience content library — a structured set of destination guides, insider recommendations, and aspirational journey content that positions ${brandName} as the most trusted advisor for your audience's travel decisions.`,
    'Fitness & Wellness':    `Build ${brandName}'s transformation content programme — a structured approach to capturing and publishing real customer outcomes that provides ongoing social proof and community inspiration for ${brandName}'s audience.`,
  };

  const strategic = STRATEGIC_BY_INDUSTRY[industry] || `Develop ${brandName}'s authority content programme — a sustained, structured approach to publishing expert-level content that positions ${brandName} as the most credible and trustworthy brand in the ${industry} space over a 90-day horizon.`;
  strategicInvestments.push(strategic);
  strategicInvestments.push(`Review ${brandName}'s full social-to-conversion pathway — ensuring social content consistently leads to a clear next step that fits where ${industry} buyers are in their decision process.`);

  return {
    quick_wins:            { timeframe: "Under 7 days", items: quickWins },
    growth_plays:          { timeframe: "30 days", items: growthPlays },
    strategic_investments: { timeframe: "60–90 days", items: strategicInvestments }
  };
}
