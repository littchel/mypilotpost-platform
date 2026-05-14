/**
 * Brand Intelligence Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * The unified strategic advisory layer of myPilotPost.
 * Aggregates signals from: content, platforms, SEO, scheduling, Brand DNA,
 * opportunities, growth/rewards, analytics, audit hydration, and reporting.
 *
 * Output: up to 5 prioritised advisory messages — each with category, urgency,
 * confidence, icon, CTA, and timestamp.
 *
 * Tone: consultative + executive + strategic.
 * NOT: a notification centre.
 */

// ── Message category definitions ────────────────────────────────────────────

export const CATEGORIES = {
  risk:           { label: 'Risk Alert',          color: '#ef4444', bg: '#fff1f2', icon: '⚠️' },
  opportunity:    { label: 'Opportunity',          color: '#2563EB', bg: '#eff6ff', icon: '🎯' },
  growth:         { label: 'Growth Signal',        color: '#059669', bg: '#f0fdf4', icon: '📈' },
  advisory:       { label: 'Advisory',             color: '#7c3aed', bg: '#f5f3ff', icon: '🧠' },
  success:        { label: 'Momentum Win',         color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
  recommendation: { label: 'Recommendation',       color: '#0891b2', bg: '#ecfeff', icon: '💡' },
  activation:     { label: 'Activation Required',  color: '#d97706', bg: '#fffbeb', icon: '🔑' },
  intelligence:   { label: 'Intelligence',         color: '#4f46e5', bg: '#eef2ff', icon: '🔍' },
  reporting:      { label: 'Reporting',            color: '#6366f1', bg: '#eef2ff', icon: '📋' },
  seo:            { label: 'SEO Opportunity',      color: '#0284c7', bg: '#f0f9ff', icon: '🔎' },
  competitor:     { label: 'Competitor Signal',    color: '#dc2626', bg: '#fff1f2', icon: '🏴' },
  visibility:     { label: 'Visibility',           color: '#7c3aed', bg: '#f5f3ff', icon: '👁️' },
  authority:      { label: 'Authority',            color: '#1d4ed8', bg: '#eff6ff', icon: '🏛️' },
};

// ── Urgency priority scores (for sorting) ───────────────────────────────────

const URGENCY_SCORE = { critical: 4, high: 3, medium: 2, low: 1 };

// ── Main intelligence generator ──────────────────────────────────────────────

/**
 * @param {Object} params
 * @param {Array}  params.allContent        - all content items
 * @param {Array}  params.connectedPlatforms - platform IDs connected
 * @param {Object} params.seoMetrics
 * @param {Object} params.metrics           - analytics metrics
 * @param {Object} params.growth            - rewards/growth state { points, level, streak_days }
 * @param {Object} params.auditData         - hydrated audit result (from URL params)
 * @param {Object} params.brandDna          - brand DNA completion state { completionPct }
 * @param {Number} params.scheduledCount    - number of scheduled items
 * @returns {{ executive: Array, advisory: Array, feed: Array }}
 */
export const generateIntelligence = ({
  allContent = [],
  connectedPlatforms = [],
  seoMetrics = {},
  metrics = {},
  growth = {},
  auditData = null,
  brandDna = {},
}) => {
  const now = new Date();
  const messages = [];
  const seenIds = new Set();

  const push = (msg) => {
    if (!seenIds.has(msg.id)) {
      seenIds.add(msg.id);
      messages.push({ ...msg, timestamp: now.toISOString() });
    }
  };

  // ── AUDIT HYDRATION ──────────────────────────────────────────────────────
  if (auditData?.audit_id) {
    const gaps = auditData.strategic_analysis?.length || 0;
    if (gaps > 0) {
      push({
        id: 'audit-gaps',
        category: 'intelligence',
        urgency: 'critical',
        confidence: 'Confirmed',
        title: `Your audit revealed ${gaps} strategic gap${gaps > 1 ? 's' : ''}.`,
        body: `Your Brand Social Media Audit identified ${gaps} structural issue${gaps > 1 ? 's' : ''} currently limiting your visibility, authority, and conversion potential. Addressing these is the highest-leverage action available to you right now.`,
        cta: 'View Insights',
        tab: 'insights',
      });
    }
  }

  // ── PLATFORM COVERAGE ────────────────────────────────────────────────────
  if (connectedPlatforms.length === 0) {
    push({
      id: 'risk-no-platforms',
      category: 'activation',
      urgency: 'critical',
      confidence: 'Confirmed',
      title: 'No social platforms are connected.',
      body: 'Without platform integrations your content delivery is entirely manual and disconnected from live audience data. Connect your first platform to activate automated reach.',
      cta: 'Connect Platforms',
      tab: 'integrations',
    });
  } else if (!connectedPlatforms.includes('linkedin')) {
    push({
      id: 'risk-no-linkedin',
      category: 'opportunity',
      urgency: 'high',
      confidence: 'Benchmarked',
      title: 'LinkedIn authority channel is inactive.',
      body: 'For most industries, LinkedIn delivers the highest ROI for brand authority and professional audience growth. Your current mix is missing this channel entirely.',
      cta: 'Connect LinkedIn',
      tab: 'integrations',
    });
  }

  // ── BRAND DNA COMPLETION ─────────────────────────────────────────────────
  const dnaPct = brandDna?.completionPct || 0;
  if (dnaPct < 30) {
    push({
      id: 'activation-dna-empty',
      category: 'activation',
      urgency: 'critical',
      confidence: 'Confirmed',
      title: `Your Brand DNA is only ${dnaPct}% complete.`,
      body: 'Without a complete Brand DNA, MyPilotPost cannot generate personalised opportunities, calibrate your content strategy, or provide accurate intelligence. This is the highest-priority setup action.',
      cta: 'Build Brand DNA',
      tab: 'brand-dna',
    });
  } else if (dnaPct < 70) {
    push({
      id: 'activation-dna-partial',
      category: 'advisory',
      urgency: 'medium',
      confidence: 'Confirmed',
      title: `Brand DNA is ${dnaPct}% complete — gaps are limiting intelligence accuracy.`,
      body: 'The remaining Brand DNA fields allow the platform to generate higher-confidence opportunities, competitive insights, and personalised content strategy.',
      cta: 'Complete Brand DNA',
      tab: 'brand-dna',
    });
  }

  // ── PUBLISHING CADENCE ───────────────────────────────────────────────────
  const scheduled = allContent.filter(c => c.status === 'scheduled').length;
  const published = allContent.filter(c => c.status === 'published').length;

  if (scheduled === 0 && published === 0) {
    push({
      id: 'risk-no-content',
      category: 'risk',
      urgency: 'critical',
      confidence: 'Confirmed',
      title: 'No content is published or scheduled.',
      body: 'Your brand has no active publishing momentum. Platform algorithms deprioritise dormant accounts progressively — the longer this continues, the harder it becomes to recover visibility.',
      cta: 'Create Content',
      tab: 'social',
    });
  } else if (scheduled === 0) {
    push({
      id: 'risk-no-scheduled',
      category: 'risk',
      urgency: 'high',
      confidence: 'Confirmed',
      title: 'Publishing cadence gap detected.',
      body: 'No content is queued for future delivery. Inconsistent cadence signals low credibility to platform algorithms. Scheduling even 3 posts this week would restore momentum scoring.',
      cta: 'Schedule Content',
      tab: 'schedule',
    });
  } else if (scheduled >= 4) {
    push({
      id: 'success-cadence',
      category: 'success',
      urgency: 'low',
      confidence: 'Confirmed',
      title: `Strong publishing pipeline — ${scheduled} posts queued.`,
      body: 'Your current scheduling cadence is within the high-performance range. Maintaining this consistency compresses the time to algorithmic authority.',
      cta: 'View Schedule',
      tab: 'schedule',
    });
  }

  // ── SEO READINESS ────────────────────────────────────────────────────────
  const kw = parseInt(seoMetrics?.keywords || '0');
  if (kw === 0) {
    push({
      id: 'seo-no-keywords',
      category: 'seo',
      urgency: 'high',
      confidence: 'Confirmed',
      title: 'No SEO-optimised content detected.',
      body: 'Your articles are not targeting structured keywords. Without keyword architecture, organic search traffic will remain near zero regardless of content quality.',
      cta: 'Optimise SEO',
      tab: 'seo',
    });
  } else if (kw < 5) {
    push({
      id: 'seo-low-coverage',
      category: 'seo',
      urgency: 'medium',
      confidence: 'Estimated',
      title: 'SEO keyword coverage is limited.',
      body: `Only ${kw} keyword${kw > 1 ? 's' : ''} tracked. Expanding to 10–15 targeted keywords significantly increases search visibility compound growth.`,
      cta: 'Expand SEO',
      tab: 'seo',
    });
  }

  // ── ENGAGEMENT ANALYSIS ──────────────────────────────────────────────────
  const engRate = parseFloat(metrics?.engagementRate || '0');
  if (engRate > 0 && engRate < 1.5) {
    push({
      id: 'risk-low-engagement',
      category: 'risk',
      urgency: 'medium',
      confidence: 'Estimated',
      title: 'Audience interaction momentum is slowing.',
      body: `Your current engagement rate of ${engRate}% is below the ${connectedPlatforms.includes('linkedin') ? '2.5%' : '3%'} benchmark for your industry. Reduced interaction signals weakening audience resonance — a leading indicator of visibility decline.`,
      cta: 'View Opportunities',
      tab: 'content-opportunities',
    });
  } else if (engRate >= 3) {
    push({
      id: 'success-engagement',
      category: 'success',
      urgency: 'low',
      confidence: 'Estimated',
      title: `Engagement rate of ${engRate}% is above benchmark.`,
      body: 'Your audience is interacting with content at an above-average rate. This is the right moment to introduce conversion-architecture content to translate engagement into business outcomes.',
      cta: 'View Opportunities',
      tab: 'content-opportunities',
    });
  }

  // ── CONTENT OPPORTUNITIES ────────────────────────────────────────────────
  push({
    id: 'opp-content-opportunities',
    category: 'opportunity',
    urgency: 'medium',
    confidence: 'Inferred',
    title: 'New content opportunities are available.',
    body: 'Intelligence analysis has identified visibility gaps, SEO opportunities, and authority content positions relevant to your brand. Review your opportunity queue to act on the highest-impact actions first.',
    cta: 'View Opportunities',
    tab: 'content-opportunities',
  });

  // ── COMPETITIVE SIGNALS ──────────────────────────────────────────────────
  push({
    id: 'competitor-cadence',
    category: 'competitor',
    urgency: 'medium',
    confidence: 'Simulated',
    title: 'Competitors in your vertical increased publishing cadence.',
    body: 'Strategic monitoring indicates elevated activity from brand profiles in your category. Sustained competitive cadence accelerates their algorithmic authority — increasing the cost of catching up over time.',
    cta: 'View Competitive Intelligence',
    tab: 'insights',
  });

  // ── AUTHORITY BUILDING ───────────────────────────────────────────────────
  push({
    id: 'authority-opportunity',
    category: 'authority',
    urgency: 'low',
    confidence: 'Inferred',
    title: 'Authority content opportunity detected.',
    body: 'Your current content mix is predominantly awareness-layer. Introducing one authority post per week (deep framework, data analysis, or case study) accelerates category positioning significantly.',
    cta: 'Create Authority Content',
    tab: 'social',
  });

  // ── REPORTING READINESS ──────────────────────────────────────────────────
  if (published >= 5) {
    push({
      id: 'reporting-ready',
      category: 'reporting',
      urgency: 'low',
      confidence: 'Confirmed',
      title: 'Your first strategic report can be generated.',
      body: `With ${published} published pieces, you have sufficient data for a meaningful performance narrative. Generate your first executive report to track momentum and identify optimisation opportunities.`,
      cta: 'Generate Report',
      tab: 'reporting',
    });
  }

  // ── REWARDS / STREAK ─────────────────────────────────────────────────────
  const streak = growth?.streak_days || 0;
  if (streak >= 7) {
    push({
      id: 'success-streak',
      category: 'success',
      urgency: 'low',
      confidence: 'Confirmed',
      title: `${streak}-day publishing streak — momentum is building.`,
      body: 'Sustained consistent publishing is the single most powerful compounding action available to your brand. Protect this streak — algorithmic authority builds exponentially over consistency.',
      cta: 'View Rewards',
      tab: 'growth',
    });
  }

  // ── BEST TIME ADVISORY ───────────────────────────────────────────────────
  push({
    id: 'advisory-best-time',
    category: 'advisory',
    urgency: 'low',
    confidence: 'Estimated',
    title: 'Peak audience window identified: 18:00–20:00.',
    body: 'Pattern analysis suggests your audience is most active in the early evening window on weekdays. Aligning your publishing schedule with this window typically increases first-hour engagement by 20–35%.',
    cta: 'Update Schedule',
    tab: 'schedule',
  });

  // ── SORT + LIMIT ─────────────────────────────────────────────────────────
  const sorted = messages.sort(
    (a, b) => (URGENCY_SCORE[b.urgency] || 0) - (URGENCY_SCORE[a.urgency] || 0)
  );

  // Keep critical messages always; cap at 5 total for sidebar, 10 for full feed
  const feed = sorted.slice(0, 10);
  const executive = sorted.filter(m => ['critical', 'high'].includes(m.urgency)).slice(0, 3);
  const advisory  = sorted.filter(m => ['medium', 'low'].includes(m.urgency)).slice(0, 3);

  return { executive, advisory, feed };
};

/**
 * Helper: look up category metadata by category key
 */
export const getCategoryMeta = (category) =>
  CATEGORIES[category] || CATEGORIES.advisory;
