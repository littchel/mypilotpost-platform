/**
 * myPilotPost — Weekly Strategic Planner
 * CADENCE • BALANCE • AUTHORITY • CONVERSION
 */

import { getDB } from "../../lib/db.js";
import { json } from "../../lib/json.js";
import { CONFIDENCE_LEVELS } from "./confidence_engine.js";

/* ======================================================
   GENERATE WEEKLY PLAN
   POST /api/customer/opportunities/weekly-plan
====================================================== */
export async function generateWeeklyPlan(request, env, auth) {
  const db = getDB(env);
  const brandId = auth.brand_id;

  // 1. Get Monday of current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStart = monday.toISOString().split('T')[0];

  // 2. Check if plan already exists for this week
  const existing = await db.prepare(
    "SELECT * FROM weekly_strategic_plans WHERE brand_id = ? AND week_start = ?"
  ).bind(brandId, weekStart).first();

  if (existing) {
    return json({ plan: formatPlan(existing), cached: true });
  }

  // 3. Gather signals
  const [dna, openOpps, analytics] = await Promise.all([
    db.prepare("SELECT * FROM brand_dna_profiles WHERE brand_id = ?").bind(brandId).first(),
    db.prepare(`
      SELECT * FROM content_opportunities
      WHERE brand_id = ? AND status = 'pending'
      ORDER BY priority ASC LIMIT 6
    `).bind(brandId).all(),
    db.prepare(`
      SELECT COUNT(*) as posts, AVG(engagement_rate) as avg_er
      FROM content_analytics
      WHERE brand_id = ? AND reported_at >= date('now', '-14 days')
    `).bind(brandId).first()
  ]);

  // 4. Build the plan
  const avgER = analytics?.avg_er || 0;
  const recentPosts = analytics?.posts || 0;

  const weekFocus = determineWeekFocus(dna, openOpps?.results || [], avgER);
  const platforms = determineTopPlatforms(openOpps?.results || []);
  const cadence = determineCadence(recentPosts, avgER);
  const contentBalance = determineContentBalance(openOpps?.results || [], avgER);

  const planData = {
    week_start: weekStart,
    focus: weekFocus,
    platforms,
    cadence,
    content_balance: contentBalance,
    top_opportunities: (openOpps?.results || []).slice(0, 3).map(o => ({
      id: o.id,
      title: o.title,
      platform: o.target_platform,
      format: o.content_format,
      urgency: o.urgency
    })),
    daily_suggestions: buildDailySuggestions(weekFocus, platforms, contentBalance),
    week_kpis: {
      target_posts: cadence,
      focus_metric: avgER < 0.02 ? 'Engagement Rate' : 'Reach',
      confidence: CONFIDENCE_LEVELS.BENCHMARKED
    }
  };

  // 5. Persist
  const planId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO weekly_strategic_plans (
      id, brand_id, week_start, week_focus, recommended_platforms,
      recommended_cadence, content_balance,
      authority_opportunities, seo_opportunities, conversion_opportunities,
      plan_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    planId, brandId, weekStart, weekFocus.title,
    JSON.stringify(platforms), cadence,
    JSON.stringify(contentBalance),
    JSON.stringify(planData.top_opportunities.filter(o => o.urgency !== 'LOW').map(o => o.id)),
    JSON.stringify([]),
    JSON.stringify([]),
    JSON.stringify(planData)
  ).run();

  return json({ plan: planData, plan_id: planId, cached: false });
}

/* ======================================================
   GET WEEKLY PLAN
   GET /api/customer/opportunities/weekly-plan
====================================================== */
export async function getWeeklyPlan(request, env, auth) {
  const db = getDB(env);
  const plan = await db.prepare(`
    SELECT * FROM weekly_strategic_plans
    WHERE brand_id = ? ORDER BY week_start DESC LIMIT 1
  `).bind(auth.brand_id).first();

  if (!plan) {
    return json({ plan: null, message: "No weekly plan yet. Run generate to create your first plan." });
  }

  return json({ plan: formatPlan(plan) });
}

/* ======================================================
   HELPERS
====================================================== */
function determineWeekFocus(dna, opps, avgER) {
  if (avgER < 0.01) {
    return { title: "Engagement Recovery Week", theme: "Re-activate your audience with high-value interactive content" };
  }
  const hasConversionOpp = opps.some(o => o.opportunity_type === 'conversion_opportunity');
  if (hasConversionOpp) {
    return { title: "Conversion Push Week", theme: "Move warm leads to action with social proof and case studies" };
  }
  return { title: "Authority Building Week", theme: "Establish thought leadership in your niche with educational content" };
}

function determineTopPlatforms(opps) {
  const counts = {};
  opps.forEach(o => {
    const p = o.target_platform || 'linkedin';
    counts[p] = (counts[p] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([p]) => p).slice(0, 3);
}

function determineCadence(recentPosts, avgER) {
  const postsPerWeek = recentPosts / 2; // 14-day window
  if (postsPerWeek < 2) return 4; // Increase cadence
  if (avgER < 0.015) return 5;    // More posts to find what works
  return 3;                        // Maintain healthy cadence
}

function determineContentBalance(opps, avgER) {
  if (avgER < 0.015) {
    return { educational: 50, engagement: 30, promotional: 10, social_proof: 10 };
  }
  return { educational: 35, engagement: 25, promotional: 20, social_proof: 20 };
}

function buildDailySuggestions(focus, platforms, balance) {
  const platform = platforms[0] || 'linkedin';
  return [
    { day: 'Monday', suggestion: `Publish an educational post on ${platform} aligned with your authority goals`, type: 'educational' },
    { day: 'Wednesday', suggestion: 'Share a client insight or testimonial to build social proof', type: 'social_proof' },
    { day: 'Friday', suggestion: 'Engagement-first content: ask a question or share a bold opinion', type: 'engagement' }
  ];
}

function formatPlan(plan) {
  return {
    ...plan,
    plan_data: plan.plan_data ? JSON.parse(plan.plan_data) : null,
    recommended_platforms: plan.recommended_platforms ? JSON.parse(plan.recommended_platforms) : [],
    content_balance: plan.content_balance ? JSON.parse(plan.content_balance) : {}
  };
}
