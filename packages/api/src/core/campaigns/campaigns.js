/**
 * myPilotPost — CAMPAIGN ENGINE V2
 * THE STRATEGIC LAYER
 * 
 * Responsibilities:
 * - Strategic container management
 * - Hybrid content linking (Direct + Join)
 * - Performance caching & status lifecycle
 * - Paginated timeline generation
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { checkFeatureAccess } from "../billing/billing.js";

/* ======================================================
   CORE — CAMPAIGNS
   ====================================================== */

/**
 * createCampaign
 */
export async function createCampaign(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);
  
  const access = await checkFeatureAccess(request, env, auth, 'campaigns');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const body = await request.json();
  const { name, objective_type, objective_text, start_date, end_date } = body;

  if (!name) return error("Name is required", 400);

  const campaignId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO campaigns (id, brand_id, name, objective_type, objective_text, status, start_date, end_date, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP)
  `).bind(campaignId, auth.brand_id, name, objective_type || 'awareness', objective_text, start_date, end_date).run();

  return json({ id: campaignId, name, status: 'active' });
}

/**
 * getCampaigns
 */
export async function getCampaigns(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'campaigns');
  if (!access.allowed) return access.response;

  const db = getDB(env);

  // Return list with basic stats
  const { results } = await db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM social_assets WHERE campaign_id = c.id) + 
      (SELECT COUNT(*) FROM blog_posts WHERE campaign_id = c.id) as content_count
    FROM campaigns c
    WHERE brand_id = ?
    ORDER BY created_at DESC
  `).bind(auth.brand_id).all();

  return json({ data: results || [] });
}

/**
 * getCampaignDetails
 */
export async function getCampaignDetails(request, env, auth, campaignId) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'campaigns');
  if (!access.allowed) return access.response;

  const db = getDB(env);

  const campaign = await db.prepare(`
    SELECT * FROM campaigns WHERE id = ? AND brand_id = ?
  `).bind(campaignId, auth.brand_id).first();

  if (!campaign) return error("Campaign not found", 404);

  // Fetch linked content
  const [social, blog] = await Promise.all([
    db.prepare(`SELECT id, title, status, created_at FROM social_assets WHERE campaign_id = ?`).bind(campaignId).all(),
    db.prepare(`SELECT id, title, status, created_at FROM blog_posts WHERE campaign_id = ?`).bind(campaignId).all()
  ]);

  // Fetch cached performance
  const performance = await db.prepare(`SELECT metrics_json FROM campaign_metrics_cache WHERE campaign_id = ?`).bind(campaignId).first();

  return json({
    campaign,
    content: {
      social: social.results || [],
      blog: blog.results || []
    },
    performance: performance ? JSON.parse(performance.metrics_json) : null
  });
}

/**
 * linkContentToCampaign
 */
export async function linkContentToCampaign(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'campaigns');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const { campaign_id, content_id, content_type } = await request.json();

  if (!campaign_id || !content_id || !content_type) return error("Missing parameters", 400);

  // 1. Direct link update (Primary Strategy)
  const Table = content_type === 'social' ? 'social_assets' : 'blog_posts';
  await db.prepare(`UPDATE ${Table} SET campaign_id = ? WHERE id = ? AND brand_id = ?`).bind(campaign_id, content_id, auth.brand_id).run();

  // 2. Multi-link update (Join Table for future flexibility)
  await db.prepare(`
    INSERT OR IGNORE INTO campaign_content_links (id, campaign_id, content_type, content_id)
    VALUES (?, ?, ?, ?)
  `).bind(crypto.randomUUID(), campaign_id, content_type, content_id).run();

  // Trigger metrics update
  await refreshPerformanceCache(db, campaign_id);

  // LOG TO MEMORY
  await writeBrandMemoryEvent(db, auth.brand_id, 'campaign_link', { 
    campaign_id, 
    content_id, 
    content_type 
  });

  return json({ success: true });
}


/**
 * unlinkContentFromCampaign
 */
export async function unlinkContentFromCampaign(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'campaigns');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const { campaign_id, content_id, content_type } = await request.json();

  const Table = content_type === 'social' ? 'social_assets' : 'blog_posts';
  await db.prepare(`UPDATE ${Table} SET campaign_id = NULL WHERE id = ? AND campaign_id = ?`).bind(content_id, campaign_id).run();
  await db.prepare(`DELETE FROM campaign_content_links WHERE campaign_id = ? AND content_id = ?`).bind(campaign_id, content_id).run();

  // Trigger metrics update
  await refreshPerformanceCache(db, campaign_id);

  return json({ success: true });
}

/* ======================================================
   PERFORMANCE & TIMELINE
   ====================================================== */

/**
 * refreshPerformanceCache
 */
export async function refreshPerformanceCache(db, campaignId) {
  // Aggregate all metrics for campaign content
  // Note: Simplified for D1 limits, ideally we'd join on content_engagement_metrics
  const metrics = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM social_assets WHERE campaign_id = ?) as total_social,
      (SELECT COUNT(*) FROM blog_posts WHERE campaign_id = ?) as total_blog,
      (SELECT COUNT(*) FROM delivery_jobs WHERE campaign_id = ? AND status = 'published') as published_count,
      (SELECT COUNT(*) FROM delivery_jobs WHERE campaign_id = ? AND status = 'failed') as failed_count,
      (SELECT COALESCE(SUM(ca.impressions), 0)
       FROM content_analytics ca
       JOIN social_assets sa ON ca.content_id = sa.id
       WHERE sa.campaign_id = ?) as total_impressions,
      (SELECT COALESCE(SUM(ca.engagements), 0)
       FROM content_analytics ca
       JOIN social_assets sa ON ca.content_id = sa.id
       WHERE sa.campaign_id = ?) as total_engagements,
      (SELECT COALESCE(SUM(ca.clicks), 0)
       FROM content_analytics ca
       JOIN social_assets sa ON ca.content_id = sa.id
       WHERE sa.campaign_id = ?) as total_clicks
  `).bind(campaignId, campaignId, campaignId, campaignId, campaignId, campaignId, campaignId).first();

  await db.prepare(`
    INSERT INTO campaign_metrics_cache (campaign_id, metrics_json, last_updated, score)
    VALUES (?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(campaign_id) DO UPDATE SET 
      metrics_json = EXCLUDED.metrics_json,
      last_updated = CURRENT_TIMESTAMP,
      score = EXCLUDED.score
  `).bind(campaignId, JSON.stringify(metrics), await calculateCampaignScore(db, campaignId)).run();
}

/**
 * getTimeline
 */
export async function getTimeline(request, env, auth, campaignId) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'campaigns');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit")) || 20;
  const offset = parseInt(url.searchParams.get("offset")) || 0;

  // Timeline pulls from delivery_jobs related to any asset in this campaign
  const { results } = await db.prepare(`
    SELECT dj.id, dj.platform, dj.status, dj.scheduled_at, sa.title as content_title
    FROM delivery_jobs dj
    JOIN social_assets sa ON dj.content_id = sa.id
    WHERE sa.campaign_id = ?
    ORDER BY dj.scheduled_at DESC
    LIMIT ? OFFSET ?
  `).bind(campaignId, limit, offset).all();

  return json({ data: results || [] });
}

/* ======================================================
   CAMPAIGN INTELLIGENCE (FOR THE BRAIN)
   ====================================================== */

export async function getCampaignInsights(request, env, auth, campaignId) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'campaigns');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  
  const campaign = await db.prepare(`SELECT * FROM campaigns WHERE id = ?`).bind(campaignId).first();
  if (!campaign) return error("Campaign not found", 404);

  const insights = [];
  
  // 1. Fetch Performance metrics
  const performanceRow = await db.prepare(`SELECT metrics_json FROM campaign_metrics_cache WHERE campaign_id = ?`).bind(campaignId).first();
  const metrics = performanceRow ? JSON.parse(performanceRow.metrics_json) : null;
  
  if (metrics) {
    // 2. Trend Analysis (Early vs Late)
    const midPoint = new Date(new Date(campaign.created_at).getTime() + (Date.now() - new Date(campaign.created_at).getTime()) / 2).toISOString();
    
    const [early, late] = await Promise.all([
      db.prepare(`
        SELECT AVG(impressions) as avg_reach 
        FROM content_analytics ca
        JOIN social_assets sa ON ca.content_id = sa.id
        WHERE sa.campaign_id = ? AND ca.reported_at < ?
      `).bind(campaignId, midPoint).first(),
      db.prepare(`
        SELECT AVG(impressions) as avg_reach 
        FROM content_analytics ca
        JOIN social_assets sa ON ca.content_id = sa.id
        WHERE sa.campaign_id = ? AND ca.reported_at >= ?
      `).bind(campaignId, midPoint).first()
    ]);

    if (early?.avg_reach > late?.avg_reach * 1.3) {
      insights.push({
        type: 'warning',
        title: 'Engagement Drop-off Detected',
        message: 'Reach has declined by over 30% since the campaign started.',
        recommendation: 'Reach has declined — try posting during peak hours or switching to media-weighted content to recover reach.',
        priority: 'high',
        confidence_score: late?.avg_reach > 0 ? 85 : 40,
        created_at: new Date().toISOString()
      });
    }

    // 3. Best Performing Content
    const best = await db.prepare(`
      SELECT sa.title, ca.impressions
      FROM content_analytics ca
      JOIN social_assets sa ON ca.content_id = sa.id
      WHERE sa.campaign_id = ?
      ORDER BY ca.impressions DESC LIMIT 1
    `).bind(campaignId).first();

    if (best) {
      insights.push({
        type: 'growth',
        title: 'Top Performer Identified',
        message: `"${best.title}" is outperforming the rest of the campaign.`,
        recommendation: 'Double down on this style of content and consider repurposing it for other platforms.',
        priority: 'medium',
        confidence_score: 95,
        created_at: new Date().toISOString()
      });
    }

    // 4. DEDUPLICATION (Reuse Intelligence Signature Logic)
    const filteredInsights = [];
    for (const ins of insights) {
      const signature = `${auth.brand_id}:${ins.type}:${ins.title}`.toLowerCase().replace(/\s+/g, '_');
      const existing = await db.prepare(`
        SELECT id FROM brand_insights 
        WHERE signature = ? AND (expires_at > DATETIME('now') OR expires_at IS NULL)
      `).bind(signature).first();
      
      if (!existing) filteredInsights.push(ins);
    }

    return json({ insights: filteredInsights });
  }

  return json({ insights: [] });
}

/**
 * getCampaignComparison
 * Returns top 3 campaigns by performance score
 */
export async function getCampaignComparison(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'campaigns');
  if (!access.allowed) return access.response;

  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT c.id, c.name, cmc.score 
    FROM campaigns c
    JOIN campaign_metrics_cache cmc ON c.id = cmc.campaign_id
    WHERE c.brand_id = ?
    ORDER BY cmc.score DESC, cmc.last_updated DESC
    LIMIT 3
  `).bind(auth.brand_id).all();

  return json({ data: results || [] });
}

/**
 * detectCampaignPatterns
 * PASSIVE: Suggest groupings based on proximity and commonality
 */
export async function detectCampaignPatterns(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'campaigns');
  if (!access.allowed) return access.response;

  const db = getDB(env);

  // Scan un-campaigned posts in last 14 days
  const { results: uncampaigned } = await db.prepare(`
    SELECT id, title, created_at, platform
    FROM social_assets 
    WHERE brand_id = ? AND campaign_id IS NULL
    AND created_at > date('now', '-14 days')
    ORDER BY created_at DESC
  `).bind(auth.brand_id).all();

  if (uncampaigned.length < 3) return json({ suggestion: null });

  // Simple logic: If 3+ posts within 5 days have similar keywords or same 48h window
  const clusters = [];
  // Proximity cluster
  const window = 5 * 24 * 60 * 60 * 1000;
  let currentCluster = [uncampaigned[0]];

  for (let i = 1; i < uncampaigned.length; i++) {
    const prev = uncampaigned[i-1];
    const curr = uncampaigned[i];
    const prevTime = new Date(prev.created_at).getTime();
    const currTime = new Date(curr.created_at).getTime();

    // STRICT: Proximity AND (Platform OR Keyword overlap)
    const isClose = prevTime - currTime < window;
    const samePlatform = prev.platform === curr.platform;
    const titleOverlap = prev.title.split(' ').slice(0, 2).some(word => curr.title.includes(word));

    if (isClose && (samePlatform || titleOverlap)) {
      currentCluster.push(curr);
    } else {
      if (currentCluster.length >= 3) clusters.push(currentCluster);
      currentCluster = [curr];
    }
  }
  if (currentCluster.length >= 3) clusters.push(currentCluster);

  if (clusters.length > 0) {
    return json({
      suggestion: {
        type: 'group_posts',
        count: clusters[0].length,
        ids: clusters[0].map(p => p.id),
        message: `We detected ${clusters[0].length} related posts in a short window. Group them into a new campaign?`
      }
    });
  }

  return json({ suggestion: null });
}

/* ======================================================
   SCORING ENGINE
   ====================================================== */

async function calculateCampaignScore(db, campaignId) {
  // Aggregate metrics
  const performanceRow = await db.prepare(`SELECT metrics_json FROM campaign_metrics_cache WHERE campaign_id = ?`).bind(campaignId).first();
  if (!performanceRow) return 0;
  
  const metrics = JSON.parse(performanceRow.metrics_json);
  const { total_social, published_count, failed_count } = metrics;

  // 1. Success Rate (Target: 100%)
  const successRate = total_social > 0 ? (published_count / (published_count + failed_count || 1)) : 1;
  const successScore = successRate * 100;

  // 2. SEO Performance
  const seoMetrics = await db.prepare(`
    SELECT SUM(impressions) as imps, SUM(clicks) as clicks 
    FROM seo_metrics sm
    JOIN social_assets sa ON sm.content_id = sa.id
    WHERE sa.campaign_id = ?
  `).bind(campaignId).first();

  const hasSEO = (seoMetrics?.imps || 0) > 0;
  const seoPerf = hasSEO ? Math.min(100, (seoMetrics.clicks / seoMetrics.imps) * 2000) : 0; // Target 5% CTR for 100pts

  // 3. Consistency (Volume check)
  const campaign = await db.prepare(`SELECT created_at FROM campaigns WHERE id = ?`).bind(campaignId).first();
  const daysActive = Math.max(1, (Date.now() - new Date(campaign.created_at).getTime()) / (24 * 60 * 60 * 1000));
  const postsPerDay = total_social / daysActive;
  const consistencyScore = Math.min(100, (postsPerDay / (3/7)) * 100); // 3 per week = 100

  // 4. Growth (Trend)
  const midPoint = new Date(new Date(campaign.created_at).getTime() + (Date.now() - new Date(campaign.created_at).getTime()) / 2).toISOString();
  const [early, late] = await Promise.all([
    db.prepare(`SELECT AVG(impressions) as reach FROM content_analytics ca JOIN social_assets sa ON ca.content_id = sa.id WHERE sa.campaign_id = ? AND ca.reported_at < ?`).bind(campaignId, midPoint).first(),
    db.prepare(`SELECT AVG(impressions) as reach FROM content_analytics ca JOIN social_assets sa ON ca.content_id = sa.id WHERE sa.campaign_id = ? AND ca.reported_at >= ?`).bind(campaignId, midPoint).first()
  ]);
  const growthScore = Math.min(100, ((late?.reach || 0) / (early?.reach || 1)) * 100);

  // 5. Final Weighted Algorithm
  // Standard: Engagement (35%), Success (20%), Consistency (20%), Growth (15%), SEO (10%)
  // Fallback (No SEO): Engagement (40%), Success (25%), Consistency (20%), Growth (15%)
  
  let finalScore = 0;
  const engagementScore = successScore; // Simplified proxy for now

  if (hasSEO) {
    finalScore = (engagementScore * 0.35) + (successScore * 0.20) + (consistencyScore * 0.20) + (growthScore * 0.15) + (seoPerf * 0.10);
  } else {
    finalScore = (engagementScore * 0.40) + (successScore * 0.25) + (consistencyScore * 0.20) + (growthScore * 0.15);
  }

  return Math.min(Math.round(finalScore), 100);
}

/* ======================================================
   HELPERS — BRAND MEMORY
   ====================================================== */

async function writeBrandMemoryEvent(db, brandId, eventType, metadata) {
  try {
    await db.prepare(`
      INSERT INTO brand_memory_events (id, brand_id, event_type, source_engine, entity_type, entity_id, snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), brandId, eventType, 'campaign', 'campaign', metadata.campaign_id || brandId, JSON.stringify(metadata)
    ).run();
  } catch (e) {
    console.error("Campaign Memory Logging Failed", e);
  }
}
