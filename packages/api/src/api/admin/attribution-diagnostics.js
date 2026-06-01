/**
 * Admin Attribution Diagnostics
 * GET /api/v1/admin/attribution/diagnostics
 *
 * Returns per-campaign attribution health across all brands,
 * and a platform-level summary of delivery + analytics gaps.
 */

import { json } from "../../lib/json.js";

export async function getAttributionDiagnostics(env) {
  const db = env.DB || env.mypilotpost;

  const brandsRes = await db.prepare(
    `SELECT id, name FROM brands ORDER BY name ASC`
  ).all();
  const brands = brandsRes.results || [];

  // Global delivery pipeline state
  const pipelineRes = await db.prepare(`
    SELECT
      COUNT(*) as total_jobs,
      SUM(CASE WHEN status = 'published'  THEN 1 ELSE 0 END) as published,
      SUM(CASE WHEN status = 'failed'     THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status IN ('scheduled','processing') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN campaign_id IS NOT NULL THEN 1 ELSE 0 END) as with_campaign_id,
      SUM(CASE WHEN external_post_id IS NOT NULL THEN 1 ELSE 0 END) as with_external_id
    FROM delivery_jobs
  `).first();

  // Analytics coverage
  const analyticsRes = await db.prepare(`
    SELECT
      COUNT(*) as total_analytics_rows,
      COUNT(DISTINCT content_id) as unique_content_ids
    FROM content_analytics
  `).first();

  // Orphaned analytics (content_analytics rows with no delivery_job)
  const orphanRes = await db.prepare(`
    SELECT COUNT(*) as orphaned
    FROM content_analytics ca
    WHERE NOT EXISTS (
      SELECT 1 FROM delivery_jobs dj WHERE dj.content_id = ca.content_id
    )
  `).first();

  // Per-brand campaign attribution
  const brandData = await Promise.all(brands.map(async brand => {
    const campaignsRes = await db.prepare(
      `SELECT id, name, status, created_at FROM campaigns WHERE brand_id = ? ORDER BY created_at DESC`
    ).bind(brand.id).all();
    const campaigns = campaignsRes.results || [];

    const campaignRows = await Promise.all(campaigns.map(async c => {
      const [content, delivery, analytics] = await Promise.all([
        db.prepare(`
          SELECT COUNT(*) as total FROM campaign_content_links WHERE campaign_id = ?
        `).bind(c.id).first(),
        db.prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
            SUM(CASE WHEN campaign_id IS NOT NULL THEN 1 ELSE 0 END) as attributed
          FROM delivery_jobs WHERE campaign_id = ?
        `).bind(c.id).first(),
        db.prepare(`
          SELECT
            COUNT(DISTINCT ca.content_id) as posts_with_analytics,
            COALESCE(SUM(ca.impressions), 0) as impressions,
            COALESCE(SUM(ca.engagements), 0) as engagements
          FROM content_analytics ca
          WHERE ca.content_id IN (
            SELECT DISTINCT content_id FROM delivery_jobs WHERE campaign_id = ?
          )
        `).bind(c.id).first(),
      ]);

      const published     = delivery?.published || 0;
      const withAnalytics = analytics?.posts_with_analytics || 0;
      const linked        = content?.total || 0;
      const totalJobs     = delivery?.total || 0;

      let health = "red";
      if (linked > 0 && published > 0 && withAnalytics > 0) health = "green";
      else if (linked > 0 || published > 0) health = "yellow";

      return {
        campaign_id:     c.id,
        campaign_name:   c.name,
        campaign_status: c.status,
        health,
        linked_content:  linked,
        published_posts: published,
        attributed_jobs: delivery?.attributed || 0,
        unlinked_jobs:   totalJobs - (delivery?.attributed || 0),
        posts_with_analytics: withAnalytics,
        missing_analytics:    Math.max(0, published - withAnalytics),
        impressions:     analytics?.impressions  || 0,
        engagements:     analytics?.engagements  || 0,
      };
    }));

    const brandHealth = campaignRows.some(r => r.health === "red")    ? "red"
                      : campaignRows.some(r => r.health === "yellow") ? "yellow"
                      : campaignRows.length > 0 ? "green" : "none";

    return {
      brand_id:     brand.id,
      brand_name:   brand.name,
      brand_health: brandHealth,
      campaign_count: campaigns.length,
      campaigns: campaignRows,
    };
  }));

  const totalCampaigns = brandData.reduce((n, b) => n + b.campaign_count, 0);
  const greenCount  = brandData.flatMap(b => b.campaigns).filter(c => c.health === "green").length;
  const yellowCount = brandData.flatMap(b => b.campaigns).filter(c => c.health === "yellow").length;
  const redCount    = brandData.flatMap(b => b.campaigns).filter(c => c.health === "red").length;

  return json({
    generated_at: new Date().toISOString(),
    summary: {
      total_brands:    brands.length,
      total_campaigns: totalCampaigns,
      attribution_green:  greenCount,
      attribution_yellow: yellowCount,
      attribution_red:    redCount,
    },
    pipeline: {
      total_jobs:       pipelineRes?.total_jobs      || 0,
      published:        pipelineRes?.published        || 0,
      failed:           pipelineRes?.failed           || 0,
      pending:          pipelineRes?.pending          || 0,
      with_campaign_id: pipelineRes?.with_campaign_id || 0,
      with_external_id: pipelineRes?.with_external_id || 0,
    },
    analytics_coverage: {
      total_rows:       analyticsRes?.total_analytics_rows || 0,
      unique_content:   analyticsRes?.unique_content_ids   || 0,
      orphaned_rows:    orphanRes?.orphaned                 || 0,
    },
    brands: brandData,
  });
}
