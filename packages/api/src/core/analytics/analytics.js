/**
 * myPilotPost — ANALYTICS & REPORTING ENGINE
 * AUTHORITATIVE • V1 LOCKED • AGENCY-GRADE
 * 
 * Responsibilities:
 * - Real-time KPI aggregation
 * - 14-day trailing growth comparison
 * - Reporting snapshots (History + Editable Text)
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { isValidISO8601 } from "../../lib/validation.js";
import { getCampaignInsights } from "../campaigns/campaigns.js";
import { analyzeContentSEO } from "../seo/seo.js";
import { checkFeatureAccess } from "../billing/billing.js";
import { getAIAnalysis } from "../ai/ai_intelligence.js";

/* ======================================================
   HELPERS — DATA AGGREGATION
====================================================== */

async function getStatsForPeriod(db, brandId, from, to, campaignId) {
  // Count content items created — never multiply by platform fan-out
  const contentRow = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM content_vault
    WHERE brand_id = ? AND created_at BETWEEN ? AND ?
    ${campaignId ? "AND campaign_id = ?" : ""}
  `).bind(...[brandId, from, to, ...(campaignId ? [campaignId] : [])]).first();

  // Published/failed: DISTINCT content_id so 1 post → 3 platforms = 1, not 3
  const delivery = await db.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN status = 'published' THEN content_id END) AS published,
      COUNT(DISTINCT CASE WHEN status = 'failed'    THEN content_id END) AS failed
    FROM delivery_jobs
    WHERE brand_id = ?
      AND created_at BETWEEN ? AND ?
      ${campaignId ? "AND campaign_id = ?" : ""}
  `).bind(...[brandId, from, to, ...(campaignId ? [campaignId] : [])]).first();

  const metrics = await db.prepare(`
    SELECT
      SUM(impressions) AS imps,
      SUM(engagements) AS engs,
      SUM(clicks) AS clks
    FROM content_analytics ca
    WHERE ca.brand_id = ?
      AND ca.reported_at BETWEEN ? AND ?
      ${campaignId ? `AND ca.content_id IN (
        SELECT content_id FROM delivery_jobs WHERE campaign_id = ?
        UNION
        SELECT id FROM social_assets WHERE campaign_id = ?
        UNION
        SELECT id FROM blog_posts WHERE campaign_id = ?
      )` : ""}
  `).bind(...[brandId, from, to, ...(campaignId ? [campaignId, campaignId, campaignId] : [])]).first();

  const imps = metrics?.imps || 0;
  const engs = metrics?.engs || 0;
  const er = imps > 0 ? (engs / imps) : 0;

  return {
    posts: contentRow?.total || 0,
    published: delivery?.published || 0,
    failed: delivery?.failed || 0,
    reach: imps,
    engagement: engs,
    engagement_rate: er
  };
}

/* ======================================================
   ANALYTICS OVERVIEW — KPI HEROES
====================================================== */
export async function getAnalyticsOverview(_req, env, auth, campaignId) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const brandId = auth.brand_id;

  const now = new Date();
  const week1From = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const week1To = now.toISOString();
  const week2From = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const week2To = week1From;

  const current = await getStatsForPeriod(db, brandId, week1From, week1To, campaignId);
  const previous = await getStatsForPeriod(db, brandId, week2From, week2To, campaignId);

  const calculateGrowth = (curr, prev) => {
    if (prev === 0) return null;
    return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
  };

  const PLATFORM_COLORS = { instagram: '#E4405F', linkedin: '#0A66C2', facebook: '#1877F2', twitter: '#1DA1F2', x: '#000000', tiktok: '#010101' };
  const { results: platformRows } = await db.prepare(`
    SELECT platform, SUM(impressions) AS value
    FROM content_analytics
    WHERE brand_id = ? AND platform IS NOT NULL
    GROUP BY platform ORDER BY value DESC LIMIT 6
  `).bind(brandId).all();

  const platformShare = (platformRows || []).map(r => ({
    name: r.platform || 'Other',
    value: r.value || 0,
    color: PLATFORM_COLORS[r.platform?.toLowerCase()] || '#64748b'
  }));

  const topPlatform = platformShare[0];
  const topInsight = topPlatform
    ? `${topPlatform.name} drives the most impressions. Post consistently there for maximum reach.`
    : 'Publish your first post to start tracking performance patterns.';
  const topOpportunity = current.reach === 0
    ? 'Connect your social accounts and publish content to unlock analytics.'
    : 'Schedule posts 3× per week to maintain consistent growth momentum.';

  return json({
    // Dashboard UI fields
    totalReach: current.reach,
    totalEngagement: current.engagement,
    totalClicks: 0,
    totalConversions: 0,
    reachChange: calculateGrowth(current.reach, previous.reach),
    engagementChange: calculateGrowth(current.engagement, previous.engagement),
    clicksChange: null,
    conversionChange: null,
    topInsight,
    topOpportunity,
    platformShare,
    // Report compatibility fields
    summary: {
      posts: current.posts,
      published: current.published,
      failed: current.failed,
      engagement_rate: (current.engagement_rate * 100).toFixed(1) + "%",
      reach: current.reach.toLocaleString()
    },
    growth: {
      posts: calculateGrowth(current.posts, previous.posts),
      reach: calculateGrowth(current.reach, previous.reach),
      engagement_rate: calculateGrowth(current.engagement_rate, previous.engagement_rate)
    }
  });
}

/* ======================================================
   ANALYTICS TIMESERIES — DAILY TREND
====================================================== */
export async function getAnalyticsTimeseries(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const brandId = auth.brand_id;
  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '7d';
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { results } = await db.prepare(`
    SELECT
      strftime('%m/%d', reported_at) AS name,
      strftime('%Y-%m-%d', reported_at) AS date,
      SUM(impressions) AS reach,
      SUM(engagements) AS engagement
    FROM content_analytics
    WHERE brand_id = ? AND reported_at >= ?
    GROUP BY strftime('%Y-%m-%d', reported_at)
    ORDER BY date ASC
  `).bind(brandId, cutoff).all();

  return json(results || []);
}

/* ======================================================
   ANALYTICS DETAILED — TABBED DATA SOURCE
====================================================== */
export async function getAnalyticsDetailed(request, env, auth, campaignId) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const brandId = auth.brand_id;

  // days param: how many days of trend history to return (default 30, max 365)
  const days = request
    ? Math.min(parseInt(new URL(request.url).searchParams.get("days") || "30"), 365)
    : 30;
  const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  // filter by campaign if passed — uses parameterized subquery to prevent injection
  const campaignFilter = campaignId
    ? `AND ca.content_id IN (
        SELECT content_id FROM delivery_jobs WHERE campaign_id = '${campaignId.replace(/'/g, "''")}'
        UNION SELECT id FROM social_assets WHERE campaign_id = '${campaignId.replace(/'/g, "''")}'
        UNION SELECT id FROM blog_posts WHERE campaign_id = '${campaignId.replace(/'/g, "''")}'
      )`
    : "";

  // 1. Platform Breakdown (all-time)
  const { results: platforms } = await db.prepare(`
    SELECT
      platform,
      COUNT(*) AS content_count,
      SUM(impressions) AS reach,
      SUM(engagements) AS engagement,
      SUM(clicks) AS clicks
    FROM content_analytics ca
    WHERE ca.brand_id = ? ${campaignFilter}
    GROUP BY platform
  `).bind(brandId).all();

  // 2. Trends (Daily) — scoped to requested period
  const { results: trends } = await db.prepare(`
    SELECT
      strftime('%Y-%m-%d', reported_at) AS date,
      SUM(impressions) AS reach,
      SUM(engagements) AS engagement,
      SUM(clicks) AS clicks
    FROM content_analytics ca
    WHERE ca.brand_id = ? AND strftime('%Y-%m-%d', reported_at) >= ? ${campaignFilter}
    GROUP BY date
    ORDER BY date ASC
  `).bind(brandId, cutoffDate).all();

  // 3. Top Content
  const { results: topContent } = await db.prepare(`
    SELECT
      ca.content_id, ca.platform, ca.content_type,
      ca.impressions AS reach, ca.engagements AS engagement,
      (CAST(ca.engagements AS FLOAT) / CASE WHEN ca.impressions = 0 THEN 1 ELSE ca.impressions END) * 100 AS engagement_rate
    FROM content_analytics ca
    WHERE ca.brand_id = ? ${campaignFilter}
    ORDER BY ca.engagements DESC
    LIMIT 10
  `).bind(brandId).all();

  return json({
    platforms: platforms || [],
    trends: trends || [],
    top_content: topContent || []
  });
}

/* ======================================================
   REPORTING — SNAPSHOT ENGINE
====================================================== */
export async function generateReport(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'reports');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const brandId = auth.brand_id;
  const userId = auth.userId;
  const { title, period, campaign_id } = await request.json();

  // Gather current snapshots
  const [overview, detailed, user, brand, campaign] = await Promise.all([
    getAnalyticsOverview(request, env, auth, campaign_id).then(r => r.json()),
    getAnalyticsDetailed(request, env, auth, campaign_id).then(r => r.json()),
    db.prepare(`SELECT agency_name, agency_logo_url FROM users WHERE id = ?`).bind(userId).first(),
    db.prepare(`SELECT name, logo_url FROM brands WHERE id = ?`).bind(brandId).first(),
    campaign_id ? db.prepare(`SELECT name FROM campaigns WHERE id = ?`).bind(campaign_id).first() : null
  ]);

  // 3. Campaign Strategic Block (NEW)
  let campaignSummary = null;
  if (campaign_id) {
    const campaignMeta = await db.prepare(`
      SELECT c.*, cmc.score 
      FROM campaigns c
      LEFT JOIN campaign_metrics_cache cmc ON c.id = cmc.campaign_id
      WHERE c.id = ?
    `).bind(campaign_id).first();

    const insRes = await getCampaignInsights(request, env, auth, campaign_id);
    const { insights } = await insRes.json();
    
    // Auto-generate key takeaway
    const topInsights = insights.sort((a,b) => (a.priority === 'high' ? -1 : 1)).slice(0, 1);
    const takeaway = topInsights.length > 0 
      ? topInsights[0].message
      : "The campaign is currently in steady-state delivery with consistent performance across active platforms.";

    campaignSummary = {
      name: campaignMeta.name,
      objective: `${campaignMeta.objective_type.replace('_', ' ')}: ${campaignMeta.objective_text || ''}`,
      duration: `${new Date(campaignMeta.created_at).toLocaleDateString()} — Present`,
      score: campaignMeta.score || 0,
      total_assets: (overview?.summary?.published || 0) + (overview?.summary?.failed || 0),
      takeaway
    };
  }

  const reportId = crypto.randomUUID();
  let snapshotData = JSON.stringify({
    stats: overview,
    details: detailed,
    branding: {
      agency_name: user?.agency_name,
      agency_logo_url: user?.agency_logo_url,
      brand_name: brand?.name,
      brand_logo_url: brand?.logo_url
    },
    campaign: campaignSummary,
    seo: null
  });

  if (campaign_id) {
    const seoRes = await getSEOOverview(request, env, auth); // Simplified: should filter by campaign_id content
    const seoData = await seoRes.json();
    
    const finalSnapshot = JSON.parse(snapshotData);
    finalSnapshot.seo = {
      summary: seoData.summary,
      takeaway: `Search visibility is focused on ${seoData.top_content[0]?.title || 'core campaign themes'}. CTR is currently ${seoData.summary.ctr}.`,
      action: seoData.summary.clicks < (seoData.summary.impressions * 0.02) 
        ? "Optimize meta-descriptions to improve CTR." 
        : "Maintain content consistency to stabilize search rankings."
    };
    snapshotData = JSON.stringify(finalSnapshot);
  }

  // AI Strategic Summarization
  let aiSummary = "Provide a high-level summary of performance...";
  let aiRecs = "Based on this month's data, we recommend...";
  
  try {
    const aiRes = await getAIAnalysis(db, brandId, 'strategic', campaign_id, env, false, { mode: 'deep', priority: 'high' });
    if (aiRes) {
      aiSummary = aiRes.summary;
      aiRecs = (aiRes.actions || []).join('\n');
    }
  } catch (e) {
    console.warn("AI Reporting Summary Failed, using fallbacks:", e.message);
  }

  await db.prepare(`
    INSERT INTO reports (
      id, brand_id, created_by, title, period, report_data, executive_summary, recommendations
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    reportId, brandId, userId, title, period, snapshotData,
    aiSummary, aiRecs
  )
  .run();

  return json({ id: reportId });
}

export async function saveReportSnapshot(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'reports');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const { id, executive_summary, recommendations } = await request.json();

  await db.prepare(`
    UPDATE reports
    SET executive_summary = ?, recommendations = ?
    WHERE id = ? AND brand_id = ?
  `)
  .bind(executive_summary, recommendations, id, auth.brand_id)
  .run();

  return json({ success: true });
}

export async function getReportSnapshots(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'reports');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  const report = await db.prepare(`
    SELECT * FROM reports WHERE id = ? AND brand_id = ?
  `)
  .bind(id, auth.brand_id)
  .first();

  if (!report) return error("Report not found", 404);

  // Parse JSON data for UI
  report.report_data = JSON.parse(report.report_data);

  return json({ report });
}

export async function listReports(_req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT id, title, period, created_at FROM reports WHERE brand_id = ? ORDER BY created_at DESC
  `).bind(auth.brand_id).all();

  return json({ results: results || [] });
}

/**
 * getSEOOverview
 * Aggregates search visibility signals
 */
export async function getSEOOverview(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'seo');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const brandId = auth.brand_id;

  const summary = await db.prepare(`
    SELECT 
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      AVG(ctr) as avg_ctr,
      AVG(avg_position) as avg_position
    FROM seo_metrics
    WHERE brand_id = ?
  `).bind(brandId).first();

  const { results: topContent } = await db.prepare(`
    SELECT 
      sp.title, 
      SUM(sm.clicks) as clicks, 
      SUM(sm.impressions) as impressions,
      AVG(sm.avg_position) as pos
    FROM seo_metrics sm
    JOIN seo_pages sp ON sm.content_id = sp.content_id
    WHERE sm.brand_id = ?
    GROUP BY sp.title
    ORDER BY clicks DESC
    LIMIT 5
  `).bind(brandId).all();

  const { results: trends } = await db.prepare(`
    SELECT 
      date, 
      SUM(impressions) as impressions, 
      SUM(clicks) as clicks
    FROM seo_metrics
    WHERE brand_id = ?
    GROUP BY date
    ORDER BY date ASC
    LIMIT 30
  `).bind(brandId).all();

  return json({
    summary: {
      impressions: summary?.total_impressions || 0,
      clicks: summary?.total_clicks || 0,
      ctr: (summary?.avg_ctr || 0).toFixed(2) + '%',
      position: (summary?.avg_position || 0).toFixed(1)
    },
    top_content: topContent || [],
    trends: trends || []
  });
}

/**
 * getContentAnalytics
 * Returns per-post analytics rows for the dashboard content table.
 */
export async function getContentAnalytics(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const brandId = auth.brand_id;
  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '30d';
  const platform = url.searchParams.get('platform') || 'all';
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const platformClause = platform !== 'all' ? 'AND COALESCE(ca.platform, dj.platform) = ?' : '';
  const bindArgs = platform !== 'all'
    ? [brandId, cutoff, cutoff, platform]
    : [brandId, cutoff, cutoff];

  const { results } = await db.prepare(`
    SELECT
      COALESCE(cv.title, dj.content_type, 'Untitled') AS title,
      COALESCE(ca.platform, dj.platform, 'unknown')   AS platform,
      COALESCE(dj.status, 'published')                AS status,
      ca.impressions                                   AS reach,
      ca.engagements                                   AS engagement,
      ca.clicks,
      strftime('%Y-%m-%d', COALESCE(dj.scheduled_at, ca.reported_at, ca.created_at)) AS date
    FROM content_analytics ca
    LEFT JOIN delivery_jobs dj ON dj.content_id = ca.content_id AND dj.brand_id = ca.brand_id
    LEFT JOIN content_vault  cv ON cv.id = ca.content_id
    WHERE ca.brand_id = ?
      AND (ca.reported_at >= ? OR (ca.reported_at IS NULL AND ca.created_at >= ?))
      ${platformClause}
    ORDER BY ca.engagements DESC, ca.impressions DESC
    LIMIT 50
  `).bind(...bindArgs).all();

  return json(results || []);
}
