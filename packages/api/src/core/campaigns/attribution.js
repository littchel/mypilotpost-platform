/**
 * Campaign Attribution Engine
 *
 * Canonical queries for the full attribution chain:
 *   campaigns → delivery_jobs → content_analytics → campaign_outcomes
 *
 * All external systems (Growth Engine, Brand Intelligence, Analytics, ROI)
 * must use these functions rather than writing ad-hoc attribution joins.
 */

import { getDB } from "../../lib/db.js";

/**
 * Returns the full attribution chain for a single campaign.
 * Confidence levels:
 *   high   — delivery_jobs.campaign_id set (direct, written at scheduling time)
 *   medium — attributed via social_assets.campaign_id JOIN
 *   none   — no attribution path
 */
export async function getCampaignAttribution(env, campaignId) {
  const db = getDB(env);

  const [
    campaign,
    contentCounts,
    deliveryStats,
    analyticsStats,
    reachTrend,
  ] = await Promise.all([
    db.prepare(`SELECT id, brand_id, name, status, start_date, end_date FROM campaigns WHERE id = ?`)
      .bind(campaignId).first(),

    // Content directly linked to campaign
    db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN content_type = 'social' THEN 1 ELSE 0 END) as social,
        SUM(CASE WHEN content_type = 'blog'   THEN 1 ELSE 0 END) as blog
      FROM campaign_content_links WHERE campaign_id = ?
    `).bind(campaignId).first(),

    // Delivery jobs — primary (direct campaign_id) + secondary (via social_assets join)
    db.prepare(`
      SELECT
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'failed'    THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status IN ('scheduled','processing') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN campaign_id IS NOT NULL THEN 1 ELSE 0 END) as directly_attributed
      FROM delivery_jobs WHERE campaign_id = ?
    `).bind(campaignId).first(),

    // Analytics attributed via delivery_jobs.campaign_id (high confidence)
    db.prepare(`
      SELECT
        COUNT(DISTINCT ca.content_id) as attributed_posts,
        COALESCE(SUM(ca.impressions),  0) as impressions,
        COALESCE(SUM(ca.engagements),  0) as engagements,
        COALESCE(SUM(ca.clicks),       0) as clicks,
        COALESCE(SUM(ca.comments),     0) as comments,
        COALESCE(SUM(ca.shares),       0) as shares,
        COALESCE(SUM(ca.saves),        0) as saves
      FROM content_analytics ca
      WHERE ca.content_id IN (
        SELECT DISTINCT content_id FROM delivery_jobs WHERE campaign_id = ?
      )
    `).bind(campaignId).first(),

    // Weekly reach trend for the last 8 weeks (via delivery_jobs.campaign_id)
    db.prepare(`
      SELECT
        strftime('%Y-W%W', da.date) as week,
        SUM(da.impressions)  as impressions,
        SUM(da.engagements)  as engagements
      FROM daily_analytics da
      WHERE da.brand_id = (SELECT brand_id FROM campaigns WHERE id = ?)
        AND da.date >= date('now', '-56 days')
      GROUP BY week
      ORDER BY week ASC
    `).bind(campaignId).all(),
  ]);

  if (!campaign) return null;

  const directJobs  = deliveryStats?.directly_attributed  || 0;
  const totalJobs   = deliveryStats?.total_jobs           || 0;
  const linkedContent = contentCounts?.total || 0;

  // Attribution health
  let health = "red";
  if (directJobs > 0 && analyticsStats?.attributed_posts > 0) health = "green";
  else if (linkedContent > 0 || directJobs > 0) health = "yellow";

  return {
    campaign_id:    campaignId,
    campaign_name:  campaign.name,
    campaign_status: campaign.status,
    attribution_health: health,
    content: {
      linked:  linkedContent,
      social:  contentCounts?.social || 0,
      blog:    contentCounts?.blog   || 0,
    },
    delivery: {
      total:              totalJobs,
      published:          deliveryStats?.published || 0,
      failed:             deliveryStats?.failed    || 0,
      pending:            deliveryStats?.pending   || 0,
      directly_attributed: directJobs,
      unattributed:       totalJobs - directJobs,
    },
    analytics: {
      attributed_posts: analyticsStats?.attributed_posts || 0,
      missing_analytics: (deliveryStats?.published || 0) - (analyticsStats?.attributed_posts || 0),
      impressions:  analyticsStats?.impressions  || 0,
      engagements:  analyticsStats?.engagements  || 0,
      clicks:       analyticsStats?.clicks       || 0,
      comments:     analyticsStats?.comments     || 0,
      shares:       analyticsStats?.shares       || 0,
      saves:        analyticsStats?.saves        || 0,
    },
    reach_trend: reachTrend?.results || [],
    confidence: directJobs > 0 ? "high" : linkedContent > 0 ? "medium" : "none",
  };
}

/**
 * Returns attribution summary for all campaigns belonging to a brand.
 * Used by the admin Operations Center and Growth Engine.
 */
export async function getBrandAttributionSummary(env, brandId) {
  const db = getDB(env);

  const campaignsRes = await db.prepare(
    `SELECT id, name, status FROM campaigns WHERE brand_id = ? ORDER BY created_at DESC`
  ).bind(brandId).all();

  const campaigns = campaignsRes.results || [];
  const results = await Promise.all(
    campaigns.map(c => getCampaignAttribution(env, c.id))
  );

  return results.filter(Boolean);
}

/**
 * Given a content_id, resolve which campaign it belongs to.
 * Checks in priority order: delivery_jobs.campaign_id → social_assets.campaign_id
 * → campaign_content_links.
 */
export async function resolveContentCampaign(db, contentId) {
  const fromJob = await db.prepare(
    `SELECT campaign_id FROM delivery_jobs WHERE content_id = ? AND campaign_id IS NOT NULL LIMIT 1`
  ).bind(contentId).first();
  if (fromJob?.campaign_id) return { campaign_id: fromJob.campaign_id, confidence: "high" };

  const fromAsset = await db.prepare(
    `SELECT campaign_id FROM social_assets WHERE id = ? AND campaign_id IS NOT NULL LIMIT 1`
  ).bind(contentId).first();
  if (fromAsset?.campaign_id) return { campaign_id: fromAsset.campaign_id, confidence: "medium" };

  const fromLink = await db.prepare(
    `SELECT campaign_id FROM campaign_content_links WHERE content_id = ? LIMIT 1`
  ).bind(contentId).first();
  if (fromLink?.campaign_id) return { campaign_id: fromLink.campaign_id, confidence: "medium" };

  return null;
}
