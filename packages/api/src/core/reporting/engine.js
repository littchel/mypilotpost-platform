// packages/api/src/core/reporting/engine.js
import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";

/**
 * REPORTING SYSTEM — DATA INTEGRITY LOCKED
 */

export async function generateReport(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;

  // 1. Fetch Published Content Only
  const { results: publishedContent } = await db.prepare(`
    SELECT id, title, updated_at as published_at 
    FROM social_assets 
    WHERE brand_id = ? AND lifecycle_status = 'published'
  `).bind(brand_id).all();

  // 2. Aggregate Analytics
  const { results: metrics } = await db.prepare(`
    SELECT metric_type, SUM(value) as total_value
    FROM content_engagement_metrics
    WHERE brand_id = ?
    GROUP BY metric_type
  `).bind(brand_id).all();

  // 3. Growth Insights
  const { results: growth } = await db.prepare(`
    SELECT action_type, SUM(points) as points
    FROM growth_activity_log
    WHERE brand_id = ?
    GROUP BY action_type
  `).bind(brand_id).all();

  const reportData = {
    generated_at: new Date().toISOString(),
    brand_id,
    summary: {
      total_published: publishedContent.length,
      metrics: metrics || [],
      growth: growth || []
    },
    published_items: publishedContent
  };

  const reportId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO brand_reports (id, brand_id, report_data)
    VALUES (?, ?, ?)
  `).bind(reportId, brand_id, JSON.stringify(reportData)).run();

  return json({
    success: true,
    report_id: reportId,
    data: reportData
  });
}

export async function listReports(request, env, auth) {
  const db = getDB(env);
  const { brand_id } = auth;

  const { results } = await db.prepare(`
    SELECT id, generated_at 
    FROM brand_reports 
    WHERE brand_id = ? 
    ORDER BY generated_at DESC
  `).bind(brand_id).all();

  return json({ success: true, data: results || [] });
}
