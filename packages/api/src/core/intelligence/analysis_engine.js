/**
 * myPilotPost — Strategic Analysis Engine (v3 — Brand-Specific Intelligence)
 *
 * HONEST DATA POLICY:
 * - Observed:  brand name, website presence, platforms selected, goals selected
 * - Inferred:  strategic implications from industry + observable signals
 * - Estimated: benchmarks from industry research
 * - NOT claimed: posting frequency, engagement rates, algorithm performance, follower counts
 */

import { CONFIDENCE_LEVELS } from "./confidence_engine.js";

// ─── Industry-specific recommendation templates ───────────────────────────────

const CONSISTENCY_BY_INDUSTRY = {
  'SaaS / Software':       (b) => `For ${b}, a consistent publishing cadence of 3–4x per week signals active product development and ongoing customer investment — two qualities that B2B software buyers closely evaluate before trialing a new tool.`,
  'Fintech':               (b) => `Trust is built incrementally in financial services. A regular content schedule from ${b} demonstrates operational stability and keeps your brand visible during the extended consideration cycle typical of fintech buyers.`,
  'AI & Machine Learning': (b) => `The AI space evolves rapidly and thought leadership requires sustained, visible presence. ${b} can own a credible authority position by publishing regularly — irregular publishing concedes that position to competitors.`,
  'E-commerce':            (b) => `For ${b}, consistent posting maintains purchase intent in an audience that makes buying decisions through repeated brand exposure. E-commerce audiences need regular touchpoints to move from awareness to conversion.`,
  'Real Estate':           (b) => `${b} operates in a relationship-driven industry where sustained visibility creates the trust needed before buyers or sellers make contact. A consistent publishing cadence keeps ${b} in the consideration set across the full decision timeline.`,
  'Consulting / B2B':      (b) => `B2B buyers conduct extended research before engaging a consulting firm. Consistent content from ${b} ensures your brand appears at every stage of that research — not just when a decision is being finalised.`,
  'Healthcare':            (b) => `Healthcare audiences return to trusted voices, and trust is built through perceived reliability. ${b} can establish that position with a dependable content schedule that consistently delivers value to its patient or practitioner audience.`,
  'Education':             (b) => `Educational audiences follow consistent sources. A reliable publishing cadence helps ${b} become a go-to resource in your niche rather than an occasional contributor that audiences discover but don't consistently follow.`,
  'Retail / Fashion':      (b) => `Fashion and retail audiences respond to trend-responsive brands. ${b} needs consistent presence to capture discovery moments — most purchase decisions happen within the first few brand exposures.`,
  'Food & Beverage':       (b) => `Appetite-driven purchase decisions are often impulse-triggered. Regular posts from ${b} ensure your brand is present when hunger, curiosity, or occasion creates buying intent in your audience.`,
  'Travel & Hospitality':  (b) => `Travel decisions often take months to form. ${b} needs consistent presence across that entire consideration window to remain part of the final destination or booking shortlist.`,
  'Fitness & Wellness':    (b) => `Wellness audiences form strong brand loyalties, but consistency is the entry price. ${b} needs regular presence to become part of the daily health routine of its target audience — not just an occasional source of inspiration.`,
};

const ENGAGEMENT_BY_INDUSTRY = {
  'SaaS / Software':       (b) => `${b} can improve content resonance by leading with specific customer outcomes, quantified results, and real use cases rather than feature descriptions. SaaS buyers make evidence-based decisions — they respond to proof, not promises.`,
  'Fintech':               (b) => `${b} can drive meaningfully higher engagement by simplifying complex financial topics into plain-language explainers. Content that reduces financial anxiety and builds clarity consistently outperforms promotional posts in fintech.`,
  'AI & Machine Learning': (b) => `${b} can differentiate by translating technical AI capability into practical, human-readable business impact. Accessible explainers and real-world application stories consistently outperform abstract technical content.`,
  'E-commerce':            (b) => `${b} can improve engagement by shifting from product-focused posts toward lifestyle context, customer-generated content, and social proof formats. E-commerce audiences engage with brands they aspire to — not brands that simply show products.`,
  'Real Estate':           (b) => `${b} can reframe content around buyer and seller decisions rather than property listings. Behind-the-scenes stories, local market observations, and decision-making guidance generate far higher engagement than announcement-style listing posts.`,
  'Consulting / B2B':      (b) => `${b} can publish packaged frameworks, structured models, and strategic insights — not just case studies — to engage B2B audiences earlier in their research cycle. Intellectual generosity builds the trust that precedes client conversations.`,
  'Healthcare':            (b) => `${b} can improve resonance by directly answering the specific questions patients ask before booking. Patient education content consistently outperforms promotional posts in healthcare because it addresses real, active concerns.`,
  'Education':             (b) => `${b} can adapt long-form curriculum into micro-learning social formats and lead with student success stories. Short-form educational content that delivers immediate value generates strong engagement and drives enrolment interest.`,
  'Retail / Fashion':      (b) => `${b} can drive higher engagement by showcasing product in motion, styling context, and real-life use rather than static photography. Short-form video consistently outperforms static content in retail and fashion discovery.`,
  'Food & Beverage':       (b) => `${b} can unlock higher engagement by publishing process content — how it's made, sourcing stories, the people behind it. Behind-the-scenes food content consistently outperforms finished-product photography by building emotional connection to the brand.`,
  'Travel & Hospitality':  (b) => `${b} can shift the content mix toward experience-led storytelling and emotional triggers rather than availability announcements. Aspirational travel content consistently outperforms promotional offers.`,
  'Fitness & Wellness':    (b) => `${b} can prioritise real transformation content and expert-led educational series over product promotion. Wellness audiences respond to evidence of outcomes — authentic results content consistently outperforms brand-promotional posts.`,
};

const PLATFORM_BY_INDUSTRY = {
  'SaaS / Software':       (b) => `${b} should prioritise LinkedIn for B2B reach, pairing it with YouTube or a company podcast for long-form technical authority. Twitter/X remains an active community for developers, founders, and SaaS operators.`,
  'Fintech':               (b) => `LinkedIn is essential for B2B fintech positioning. ${b} can supplement with YouTube for financial education content, and Twitter/X for real-time market commentary that financially informed audiences closely follow.`,
  'AI & Machine Learning': (b) => `LinkedIn and Twitter/X are the core distribution platforms for AI and technology audiences. ${b} can expand with YouTube for technical deep-dives and a newsletter format for direct, high-trust audience communication.`,
  'E-commerce':            (b) => `${b} should anchor on Instagram and TikTok for product discovery, supplementing with Pinterest if the product has strong visual appeal. Facebook remains effective for retargeting and community-building across a broader demographic.`,
  'Real Estate':           (b) => `${b} should prioritise Instagram for property and lifestyle content, Facebook for local community reach, and LinkedIn for referral partner relationships. YouTube adds durable SEO value through property tour and market insight content.`,
  'Consulting / B2B':      (b) => `LinkedIn is the primary platform for B2B consulting authority. ${b} can supplement with a direct newsletter for owned audience development, and YouTube for strategic content that demonstrates methodology and depth.`,
  'Healthcare':            (b) => `${b} should prioritise Facebook for community reach (particularly effective for patient communities), Instagram for visual trust-building, and LinkedIn for referral and professional network development.`,
  'Education':             (b) => `YouTube provides powerful organic discovery for educational content. ${b} can anchor on YouTube for course previews and tutorials, with Instagram and TikTok for short-form awareness content reaching prospective students at the discovery stage.`,
  'Retail / Fashion':      (b) => `Instagram and TikTok are the primary discovery platforms for retail and fashion. ${b} should ensure strong presence on both, with Pinterest as a secondary channel for purchase-intent discovery.`,
  'Food & Beverage':       (b) => `Instagram and TikTok are primary for food and beverage brand discovery. ${b} can add Facebook for community building and event promotion, and YouTube for recipe and behind-the-scenes content with long-tail search value.`,
  'Travel & Hospitality':  (b) => `${b} should prioritise Instagram and TikTok for aspirational visual content, YouTube for destination guides and experience content, and Facebook for community and booking-intent audiences.`,
  'Fitness & Wellness':    (b) => `Instagram and TikTok are primary for fitness and wellness brands. ${b} can add YouTube for long-form transformation and educational content, and a direct newsletter for retention-focused communication with an engaged existing audience.`,
};

function getRec(map, industry, brandName) {
  const fn = map[industry] || map['Consulting / B2B'];
  return fn(brandName);
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateStrategicAnalysis(weaknesses, industry = 'General', brandName = 'Your brand') {
  const results = [];

  if (weaknesses.includes('low_consistency')) {
    results.push({
      id: crypto.randomUUID(),
      metric: "Publishing Consistency",
      cause: `${brandName}'s publishing pattern has not yet established the regular presence required to build reliable audience recall in the ${industry} space.`,
      business_impact: `Inconsistent publishing reduces ${brandName}'s likelihood of being visible at the moment a potential customer is actively researching solutions in ${industry}.`,
      strategic_risk: "Brands that publish consistently capture long-term topical authority. Irregular publishing creates space for competitors to fill the gap.",
      opportunity: `${brandName} can build reliable brand recall through a structured publishing cadence tailored to the ${industry} audience.`,
      recommendation: getRec(CONSISTENCY_BY_INDUSTRY, industry, brandName),
      urgency: "HIGH",
      expected_outcome: "Consistent publishing typically improves profile discovery and audience retention within 30 days. Results vary by platform and audience composition.",
      confidence_level: CONFIDENCE_LEVELS.INFERRED,
      data_basis: "Inferred from publicly observable brand signals — not measured from live platform analytics."
    });
  }

  if (weaknesses.includes('low_engagement')) {
    results.push({
      id: crypto.randomUUID(),
      metric: "Content Resonance",
      cause: `${brandName}'s current content approach may not yet be optimised for the engagement patterns that drive business outcomes in the ${industry} sector.`,
      business_impact: `Content that doesn't generate meaningful interaction misses the opportunity to build audience relationships that convert to clients and customers for ${brandName}.`,
      strategic_risk: "Audiences gradually disengage from content that doesn't deliver value. Re-engagement is significantly harder than retention.",
      opportunity: `By shifting toward ${industry}-specific content formats that address real buyer questions and objectives, ${brandName} can build a more engaged and conversion-ready audience.`,
      recommendation: getRec(ENGAGEMENT_BY_INDUSTRY, industry, brandName),
      urgency: "HIGH",
      expected_outcome: "Content restructured around audience outcomes and industry-relevant questions typically generates meaningfully higher interaction than promotional-first content.",
      confidence_level: CONFIDENCE_LEVELS.INFERRED,
      data_basis: "Inferred from industry benchmarking and content strategy analysis — not measured from live engagement data."
    });
  }

  if (weaknesses.includes('platform_gap')) {
    results.push({
      id: crypto.randomUUID(),
      metric: "Platform Distribution",
      cause: `${brandName}'s current platform presence is concentrated on fewer channels than is typically optimal for ${industry} brands reaching their target audience.`,
      business_impact: `Different platforms reach audiences with different intent levels and discovery behaviours — limiting ${brandName} to fewer channels caps organic discovery potential.`,
      strategic_risk: "Single-platform concentration creates vulnerability to algorithm changes, platform shifts, or changes in where your audience spends time.",
      opportunity: `Expanding ${brandName}'s presence to platforms where ${industry} audiences are active can open new discovery channels, often by repurposing existing content.`,
      recommendation: getRec(PLATFORM_BY_INDUSTRY, industry, brandName),
      urgency: "MEDIUM",
      expected_outcome: "Multi-platform brands typically reach broader total audiences and reduce dependence on any single platform's algorithm.",
      confidence_level: CONFIDENCE_LEVELS.OBSERVED,
      data_basis: "Observed directly from platform presence information provided during audit."
    });
  }

  return results;
}

// ─── SWOT Generator ──────────────────────────────────────────────────────────

export function generateSWOT(breakdown, weaknesses, industry, brandName, platforms, website_url, goals) {
  const strengths = [];
  const weaknessItems = [];
  const opportunities = [];
  const threats = [];

  // STRENGTHS — based on actual observed / provided data
  if (platforms && platforms.length >= 3) {
    strengths.push(`Multi-platform foundation: ${brandName} has established presence across ${platforms.length} social channels, providing a base for cross-channel audience building. (Observed)`);
  } else if (platforms && platforms.length >= 1) {
    strengths.push(`Platform presence established: ${brandName} has an active social presence providing a foundation to build from. (Observed)`);
  }
  if (website_url) {
    strengths.push(`Web presence: ${brandName} has an active website, enabling CTA continuity between social content and conversion destinations. (Observed)`);
  }
  if (goals && goals.includes('thought_leadership')) {
    strengths.push(`Strategic positioning: ${brandName} has identified thought leadership as a goal — a high-value positioning approach in the ${industry} space that most brands underinvest in. (Observed)`);
  }
  if (goals && goals.includes('lead_gen')) {
    strengths.push(`Commercial alignment: ${brandName} is oriented toward lead generation, ensuring content strategy is tied directly to business outcomes rather than vanity metrics. (Observed)`);
  }
  if (breakdown && breakdown.conversion_readiness >= 70) {
    strengths.push(`Conversion signals: ${brandName} shows positive conversion readiness indicators, suggesting infrastructure exists to capture inbound audience intent. (Estimated)`);
  }
  if (strengths.length < 2) {
    strengths.push(`Strategic starting point: ${brandName} is at a stage where brand foundations can be built deliberately — without inheriting the constraints of an established but misaligned content system. (Inferred)`);
  }

  // WEAKNESSES — from detected gaps
  if (weaknesses.includes('low_consistency')) {
    weaknessItems.push(`Publishing regularity: ${brandName}'s publishing cadence has not yet reached the consistency needed for reliable audience recall in ${industry}. (Inferred)`);
  }
  if (weaknesses.includes('low_engagement')) {
    weaknessItems.push(`Content-audience fit: ${brandName}'s current content mix may not yet reflect the formats and topics that generate strong engagement in the ${industry} sector. (Inferred)`);
  }
  if (weaknesses.includes('platform_gap')) {
    weaknessItems.push(`Platform concentration: ${brandName}'s social presence is currently limited in distribution, increasing algorithm dependency and capping discovery potential. (Observed)`);
  }
  if (!website_url) {
    weaknessItems.push(`CTA continuity gap: Without a connected website, ${brandName} cannot efficiently capture inbound intent generated by social content. (Observed)`);
  }
  if (weaknessItems.length === 0) {
    weaknessItems.push(`Scale readiness: As ${brandName} grows, maintaining content quality at higher publishing volumes will require systematic content production processes. (Inferred)`);
  }

  // OPPORTUNITIES — industry-specific
  const INDUSTRY_OPPS = {
    'SaaS / Software':       [`LinkedIn thought leadership is significantly underpenetrated by most SaaS brands — a clear whitespace for ${brandName}.`, `Technical tutorial and integration content generates high organic discovery for SaaS companies and compounds in value over time.`],
    'Fintech':               [`Educational content demystifying financial concepts is undersupplied relative to audience demand — ${brandName} can fill this gap.`, `${brandName} can position as a trusted financial guide for an audience actively seeking clarity in a complex space.`],
    'AI & Machine Learning': [`Accessible, non-technical AI explainer content is significantly undersupplied relative to audience appetite across all major platforms.`, `${brandName} can own the bridge between technical AI capability and practical business application — a position most AI brands leave unclaimed.`],
    'E-commerce':            [`Short-form video product demonstrations and social proof content drive disproportionate discovery for e-commerce brands.`, `${brandName} can use platform-native formats (Reels, TikTok) to reach audiences not reachable through paid channels alone.`],
    'Real Estate':           [`Local market insight content is chronically undersupplied by most real estate brands, despite strong audience demand.`, `${brandName} can build local authority through consistent, data-informed market commentary that few competitors provide.`],
    'Consulting / B2B':      [`Packaged frameworks and strategic models published as accessible content consistently outperform case studies in B2B — most consultancies underinvest here.`, `${brandName} can create intellectual property from existing client work by restructuring insights as public content.`],
    'Healthcare':            [`Patient education content answers questions that are actively searched but frequently underserved.`, `${brandName} can build trusted authority by addressing the specific concerns patients have before seeking care.`],
    'Education':             [`Short-form micro-learning content is significantly undersupplied relative to demand in most educational niches.`, `${brandName} can use platform-native formats to reach prospective students at the awareness and consideration stages.`],
    'Retail / Fashion':      [`Creator-style short-form video consistently outperforms traditional product photography in retail discovery.`, `${brandName} can leverage trend responsiveness as a deliberate content strategy rather than a reactive tactic.`],
    'Food & Beverage':       [`Behind-the-scenes process and provenance content performs exceptionally well for food brands and is consistently undersupplied.`, `${brandName} can build emotional connection to its product story that separates it from commodity alternatives.`],
    'Travel & Hospitality':  [`Aspirational, experience-led content consistently outperforms promotional offers for travel brands.`, `${brandName} can position around the feeling of an experience rather than its price or availability.`],
    'Fitness & Wellness':    [`Transformation content and evidence-based education generate the highest trust signals in wellness.`, `${brandName} can use real customer outcomes as a primary content format, reducing dependence on promotional-first messaging.`],
  };

  const opps = INDUSTRY_OPPS[industry] || [
    `${brandName} operates in a space where content-driven authority is a durable competitive advantage.`,
    `Consistent publishing combined with ${industry}-specific content can establish ${brandName} as a recognisable voice in the market.`
  ];
  opportunities.push(...opps);

  // THREATS — honest, industry-relevant
  threats.push(`Algorithm dependency: Changes to platform algorithms can impact organic reach without warning — a risk that increases with single-platform concentration.`);
  threats.push(`Competitor mindshare: Competitors in ${industry} who publish consistently may capture audience attention during periods when ${brandName} is less active.`);
  if (platforms && platforms.length < 2) {
    threats.push(`Platform concentration risk: With limited platform diversification, ${brandName} faces vulnerability if audience behaviour shifts or a platform's algorithm deprioritises organic content.`);
  }
  if (!website_url) {
    threats.push(`Conversion leakage: Without a web presence linked from social content, inbound intent generated by ${brandName}'s social activity cannot be efficiently captured.`);
  }

  return { strengths, weaknesses: weaknessItems, opportunities, threats };
}
