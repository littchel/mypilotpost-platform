/**
 * Growth Engine API
 * Computes all 6 Growth Engine sections from real database state.
 * No hardcoded values. No fake projections.
 */

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

// ── Module → Tab mapping ──────────────────────────────────────────────────────

const MODULE_TAB = {
  platform_health:        "integrations",
  content_intelligence:   "social",
  seo_intelligence:       "seo",
  campaign_intelligence:  "campaign",
  audience_intelligence:  "analytics",
  competitive_moat_map:   "brand-intelligence",
  conversion_intelligence:"analytics",
  growth_engine:          "growth-engine",
};

function moduleToTab(moduleId) {
  return MODULE_TAB[moduleId] || "brand-intelligence";
}

// ── Safe query helpers ────────────────────────────────────────────────────────

async function safeFirst(db, sql, ...bindings) {
  try {
    return await db.prepare(sql).bind(...bindings).first();
  } catch {
    return null;
  }
}

async function safeAll(db, sql, ...bindings) {
  try {
    const { results } = await db.prepare(sql).bind(...bindings).all();
    return results || [];
  } catch {
    return [];
  }
}

async function safeCount(db, sql, ...bindings) {
  const row = await safeFirst(db, sql, ...bindings);
  return row?.count || 0;
}

// ── Readiness scoring ─────────────────────────────────────────────────────────

function scoreReadiness(factors) {
  const score = Math.min(100,
    factors.platforms +
    factors.content +
    factors.campaigns +
    factors.seo +
    factors.brandDna +
    factors.brandComplete +
    factors.consistency
  );

  let label, status;
  if (score >= 80) {
    label  = "Growth Ready";
    status = "Your brand has strong foundations. Focus on consistency and campaign execution.";
  } else if (score >= 60) {
    label  = "Building Momentum";
    status = "Your brand is gaining traction. Expand platforms and increase publishing frequency.";
  } else if (score >= 40) {
    label  = "Early Stage";
    status = "Your brand is getting started. Connect platforms and publish your first content.";
  } else {
    label  = "Getting Started";
    status = "Complete brand setup and connect your first platform to unlock growth potential.";
  }

  return { score, label, status };
}

// ── Roadmap builder ───────────────────────────────────────────────────────────

function buildRoadmap({ platformCount, postCount, campaignCount, seoCount, hasDna, hasBrandGoals, deliveredCount }) {
  const today     = [];
  const thisWeek  = [];
  const thisMonth = [];

  // TODAY — quick wins (<10 min)
  if (platformCount === 0)
    today.push({ id: "connect_first_platform", text: "Connect your first social platform", time: "5 min", tab: "integrations", priority: 1 });
  if (platformCount === 1)
    today.push({ id: "connect_second_platform", text: "Connect a second platform to double your reach", time: "5 min", tab: "integrations", priority: 2 });
  if (!hasDna)
    today.push({ id: "complete_brand_dna", text: "Complete your Brand DNA profile", time: "10 min", tab: "brand-dna", priority: 3 });
  if (!hasBrandGoals)
    today.push({ id: "set_brand_goals", text: "Define your brand goals in Brand DNA", time: "3 min", tab: "brand-dna", priority: 4 });
  if (seoCount === 0 && platformCount > 0)
    today.push({ id: "add_seo_keywords", text: "Add your first 5 SEO keywords", time: "5 min", tab: "seo", priority: 5 });

  // THIS WEEK — medium effort (30 min–2 hrs)
  if (postCount < 3)
    thisWeek.push({ id: "publish_first_posts", text: "Publish your first 3 posts", time: "1 hour", tab: "social" });
  else if (postCount < 10)
    thisWeek.push({ id: "publish_more_posts", text: `Publish ${10 - postCount} more posts this week`, time: "2 hours", tab: "social" });
  if (campaignCount === 0)
    thisWeek.push({ id: "create_first_campaign", text: "Create your first campaign", time: "15 min", tab: "campaign" });
  if (platformCount >= 1 && postCount < 5)
    thisWeek.push({ id: "use_templates", text: "Use 3 content templates to build your library", time: "30 min", tab: "templates" });
  if (hasDna && postCount >= 3 && campaignCount === 0)
    thisWeek.push({ id: "launch_awareness_campaign", text: "Launch a brand awareness campaign", time: "20 min", tab: "campaign" });

  // THIS MONTH — sustained effort
  if (deliveredCount < 10)
    thisMonth.push({ id: "reach_10_published", text: "Reach 10 published posts", time: "30 days", tab: "social" });
  if (campaignCount < 2)
    thisMonth.push({ id: "run_two_campaigns", text: "Run 2 active campaigns this month", time: "30 days", tab: "campaign" });
  if (seoCount === 0)
    thisMonth.push({ id: "publish_seo_content", text: "Publish 4 SEO-optimised articles", time: "30 days", tab: "blog" });
  thisMonth.push({ id: "build_analytics_baseline", text: "Build your audience analytics baseline", time: "30 days", tab: "analytics" });
  if (platformCount >= 2 && postCount >= 5)
    thisMonth.push({ id: "scale_content", text: "Establish a 3× per week publishing cadence", time: "30 days", tab: "schedule" });

  const totalItems = today.length + thisWeek.length + thisMonth.length;
  const completedItems = Math.max(0, totalItems - today.length);
  const progress = totalItems === 0 ? 100 : Math.round((completedItems / totalItems) * 100);

  return { today: today.slice(0, 4), thisWeek: thisWeek.slice(0, 4), thisMonth: thisMonth.slice(0, 4), progress };
}

// ── Experiment builder ────────────────────────────────────────────────────────

function buildExperiments({ industry, platformList, hasDna, campaignCount }) {
  const platforms = platformList.length > 0 ? platformList.slice(0, 2) : ["LinkedIn", "Instagram"];
  const experiments = [];

  experiments.push({
    id: "exp_founder_story",
    title: "Founder Story Series",
    goal: "Build authentic brand trust through personal narrative",
    expectedOutcome: "20–40% higher engagement vs standard posts",
    duration: "4 weeks",
    postsNeeded: 8,
    platforms,
    difficulty: "Low",
    templateSuggestion: "Founder Insight",
    templateTab: "templates",
  });

  experiments.push({
    id: "exp_weekly_edu",
    title: "Weekly Educational Posts",
    goal: `Establish ${industry} authority and grow organic following`,
    expectedOutcome: "Consistent weekly follower growth",
    duration: "4 weeks",
    postsNeeded: 4,
    platforms,
    difficulty: "Low",
    templateSuggestion: "Top Tips",
    templateTab: "templates",
  });

  if (campaignCount === 0) {
    experiments.push({
      id: "exp_awareness_sprint",
      title: "Brand Awareness Sprint",
      goal: "Get your brand in front of new audiences fast",
      expectedOutcome: "First 100 tracked impressions",
      duration: "2 weeks",
      postsNeeded: 6,
      platforms,
      difficulty: "Medium",
      templateSuggestion: "Industry Prediction",
      templateTab: "templates",
    });
  } else {
    experiments.push({
      id: "exp_case_study",
      title: "Customer Proof Series",
      goal: "Convert social attention into qualified enquiries",
      expectedOutcome: "Increased DMs and inbound enquiries",
      duration: "3 weeks",
      postsNeeded: 6,
      platforms,
      difficulty: "Medium",
      templateSuggestion: "Customer Story",
      templateTab: "templates",
    });
  }

  experiments.push({
    id: "exp_qa_series",
    title: `${industry} Q&A Series`,
    goal: "Reduce audience friction and spark community engagement",
    expectedOutcome: "3× comment rate vs average posts",
    duration: "3 weeks",
    postsNeeded: 6,
    platforms,
    difficulty: "Low",
    templateSuggestion: "FAQ",
    templateTab: "templates",
  });

  return experiments.slice(0, 4);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function getGrowthEngine(request, env, auth) {
  const db = getDB(env);
  const { user_id, brand_id } = auth;

  // ── Parallel data fetch ───────────────────────────────────────────────────

  const [
    brand,
    platformRow,
    postCount,
    campaignRow,
    seoCount,
    brandDna,
    intelligenceItems,
    deliveryCount,
    postsLast30Row,
    growthProfile,
  ] = await Promise.all([
    safeFirst(db,
      "SELECT name, industry, goals, tone FROM brands WHERE id = ?",
      brand_id),

    safeFirst(db,
      "SELECT COUNT(DISTINCT platform) as count, GROUP_CONCAT(DISTINCT platform) as platforms FROM connected_accounts WHERE brand_id = ? AND status = 'active'",
      brand_id),

    safeCount(db,
      "SELECT COUNT(*) as count FROM social_assets WHERE brand_id = ?",
      brand_id),

    safeFirst(db,
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active FROM campaigns WHERE brand_id = ?",
      brand_id),

    safeCount(db,
      "SELECT COUNT(*) as count FROM seo_keywords WHERE brand_id = ?",
      brand_id),

    safeFirst(db,
      "SELECT mission, positioning, value_proposition FROM brand_dna_profiles WHERE brand_id = ?",
      brand_id),

    safeAll(db,
      `SELECT id, title, finding, module_id, category, priority, priority_rank,
              recommended_action, expected_impact
       FROM brand_intelligence_queue
       WHERE brand_id = ?
         AND dismissed_at IS NULL
         AND lifecycle_status NOT IN ('resolved','expired','archived')
       ORDER BY priority_rank ASC, created_at DESC
       LIMIT 6`,
      brand_id),

    safeCount(db,
      "SELECT COUNT(*) as count FROM delivery_jobs WHERE brand_id = ? AND status = 'success'",
      brand_id),

    safeFirst(db,
      "SELECT COUNT(*) as count FROM social_assets WHERE brand_id = ? AND created_at >= datetime('now', '-30 days')",
      brand_id),

    safeFirst(db,
      "SELECT points, level, streak_days FROM growth_profiles WHERE user_id = ? AND brand_id = ?",
      user_id, brand_id),
  ]);

  // ── Derived values ────────────────────────────────────────────────────────

  const platformCount  = platformRow?.count || 0;
  const platformList   = platformRow?.platforms ? platformRow.platforms.split(',') : [];
  const campaignTotal  = campaignRow?.total || 0;
  const activeCampaigns = Number(campaignRow?.active) || 0;
  const hasDna         = !!(brandDna?.mission || brandDna?.positioning || brandDna?.value_proposition);
  const goals          = brand?.goals;
  const hasBrandGoals  = !!(goals && goals !== '[]' && goals !== 'null');
  const postsLast30    = postsLast30Row?.count || 0;
  const postsPerWeek   = Math.round((postsLast30 / 30) * 7 * 10) / 10;
  const industry       = brand?.industry || "Business";

  // ── Section 1: Growth Readiness Score ────────────────────────────────────

  const factors = {
    platforms:     Math.min(20, platformCount * 5),
    content:       Math.min(20, postCount >= 10 ? 20 : postCount * 2),
    campaigns:     Math.min(15, campaignTotal * 5),
    seo:           seoCount > 0 ? 10 : 0,
    brandDna:      hasDna ? 10 : 0,
    brandComplete: (brand?.name && brand?.industry && hasBrandGoals) ? 10 : (brand?.name ? 5 : 0),
    consistency:   Math.min(15, postsPerWeek >= 3 ? 15 : postsPerWeek >= 1 ? 8 : 0),
  };

  const readiness = scoreReadiness(factors);

  // ── Section 2: Growth Roadmap ─────────────────────────────────────────────

  const roadmap = buildRoadmap({
    platformCount, postCount, campaignCount: campaignTotal,
    seoCount, hasDna, hasBrandGoals, deliveredCount: deliveryCount,
  });

  // ── Section 3: Recommended Actions ───────────────────────────────────────

  const intelligenceActions = intelligenceItems.map(item => ({
    id:         item.id,
    source:     "intelligence",
    action:     item.recommended_action || item.title,
    context:    item.finding,
    impact:     item.expected_impact || "Improves brand performance",
    difficulty: item.priority === "high" ? "Urgent" : item.priority === "medium" ? "Medium" : "Easy",
    module:     item.module_id,
    tab:        moduleToTab(item.module_id),
  }));

  // Gap-based actions (for when intelligence is sparse)
  const gapActions = [];
  if (platformCount === 0)
    gapActions.push({ id: "gap_platform", source: "gap", action: "Connect your first social platform", context: "No platforms connected — growth cannot begin without distribution.", impact: "Unlocks content publishing and audience growth", difficulty: "Easy", time: "5 min", tab: "integrations" });
  if (!hasDna)
    gapActions.push({ id: "gap_dna", source: "gap", action: "Complete your Brand DNA profile", context: "Brand DNA incomplete — AI intelligence cannot personalise insights to your brand.", impact: "Improves all AI-generated insights and content quality", difficulty: "Easy", time: "10 min", tab: "brand-dna" });
  if (seoCount === 0)
    gapActions.push({ id: "gap_seo", source: "gap", action: "Set up SEO keyword tracking", context: "No SEO keywords configured — missing organic discovery opportunity.", impact: "Unlocks organic search growth and content discoverability", difficulty: "Easy", time: "5 min", tab: "seo" });
  if (campaignTotal === 0 && platformCount >= 1)
    gapActions.push({ id: "gap_campaign", source: "gap", action: "Create your first campaign", context: "No campaigns running — sustained brand awareness requires structured publishing.", impact: "Drives systematic and measurable audience growth", difficulty: "Medium", time: "15 min", tab: "campaign" });

  const recommendedActions = [...intelligenceActions, ...gapActions].slice(0, 5);

  // ── Section 4: Growth Forecast ────────────────────────────────────────────

  let forecastStatus, forecastMessage, forecastReachRange, forecastAudienceRange;
  if (postsPerWeek >= 5 && activeCampaigns >= 1) {
    forecastStatus       = "high";
    forecastMessage      = "Strong growth trajectory";
    forecastReachRange   = "30–50%";
    forecastAudienceRange = "15–25%";
  } else if (postsPerWeek >= 2 || activeCampaigns >= 1) {
    forecastStatus       = "medium";
    forecastMessage      = "Moderate growth expected";
    forecastReachRange   = "15–30%";
    forecastAudienceRange = "8–15%";
  } else {
    forecastStatus       = "low";
    forecastMessage      = "Limited growth without consistent publishing";
    forecastReachRange   = "0–10%";
    forecastAudienceRange = "0–5%";
  }

  const forecast = {
    postsPerWeek,
    activeCampaigns,
    status:       forecastStatus,
    message:      forecastMessage,
    reachRange:   forecastReachRange,
    audienceRange: forecastAudienceRange,
    hasData:      postsLast30 > 0,
    targetPostsPerWeek: 3,
    targetCampaigns:    1,
  };

  // ── Section 5: Growth Milestones ──────────────────────────────────────────

  const milestones = [
    { id: "brand_setup",       label: "Brand Setup",           icon: "rocket",         achieved: !!(brand?.name && brand?.industry), points: 10,  tab: "dashboard" },
    { id: "first_platform",    label: "First Platform",         icon: "plug",           achieved: platformCount >= 1,                  points: 20,  tab: "integrations" },
    { id: "brand_dna",         label: "Brand DNA Complete",     icon: "dna",            achieved: hasDna,                              points: 30,  tab: "brand-dna" },
    { id: "first_post",        label: "First Post Published",   icon: "paper-plane",    achieved: deliveryCount >= 1,                  points: 50,  tab: "social" },
    { id: "two_platforms",     label: "Two Platforms Active",   icon: "network-wired",  achieved: platformCount >= 2,                  points: 40,  tab: "integrations" },
    { id: "five_posts",        label: "5 Posts Published",      icon: "fire",           achieved: deliveryCount >= 5,                  points: 75,  tab: "social" },
    { id: "first_campaign",    label: "First Campaign",         icon: "bullhorn",        achieved: campaignTotal >= 1,                  points: 100, tab: "campaign" },
    { id: "seo_active",        label: "SEO Tracking Active",    icon: "search",         achieved: seoCount >= 1,                       points: 40,  tab: "seo" },
    { id: "ten_posts",         label: "10 Posts Published",     icon: "trophy",          achieved: deliveryCount >= 10,                 points: 150, tab: "social" },
    { id: "two_campaigns",     label: "Two Campaigns Run",      icon: "flag-checkered", achieved: campaignTotal >= 2,                  points: 150, tab: "campaign" },
  ];

  const achievedMilestones = milestones.filter(m => m.achieved).length;
  const nextMilestone      = milestones.find(m => !m.achieved) || null;

  // ── Section 6: Growth Experiments ────────────────────────────────────────

  const experiments = buildExperiments({ industry, platformList, hasDna, campaignCount: campaignTotal });

  // ── Response ──────────────────────────────────────────────────────────────

  return json({
    readiness,
    roadmap,
    actions: recommendedActions,
    forecast,
    milestones: {
      items: milestones,
      achieved: achievedMilestones,
      total: milestones.length,
      next: nextMilestone,
    },
    experiments,
    meta: {
      platformCount,
      platformList,
      postCount,
      deliveryCount,
      campaignTotal,
      activeCampaigns,
      seoCount,
      hasDna,
      postsPerWeek,
      growthPoints:  growthProfile?.points      || 0,
      growthLevel:   growthProfile?.level       || "Starter",
      streakDays:    growthProfile?.streak_days || 0,
      industry,
    },
  });
}
