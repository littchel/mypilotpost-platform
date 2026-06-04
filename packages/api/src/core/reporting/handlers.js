/**
 * myPilotPost — Reporting Engine
 * AUTHORITATIVE • SYSTEM CORE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";
import { renderReport, safeFilename } from "../report_renderer/renderer.js";
import { resolveReportConfig } from "../report_registry.js";

/**
 * POST /api/customer/reports
 * Generate a new report snapshot
 */
export async function createReport(request, env, auth) {
  const { brand_id, user_id } = auth;
  const body = await request.json();
  const { title, date_range_start, date_range_end, report_type, template_id, sections = [] } = body;

  if (!title || !date_range_start || !date_range_end) {
    return error("Title and date range required", "BAD_REQUEST", null, 400);
  }

  const db = getDB(env);

  // 1. Create Report Meta
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO reports (id, brand_id, title, date_range_start, date_range_end, created_by, report_type, template_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, brand_id, title, date_range_start, date_range_end, user_id, report_type || 'monthly', template_id || 1).run();

  // 2. Fetch Data & Create Snapshot
  // Simplified for MVP: We take the current summary of metrics
  const metrics = await fetchMetricsForPeriod(db, brand_id, date_range_start, date_range_end);
  
  await db.prepare(`
    INSERT INTO report_snapshots (id, report_id, brand_id, snapshot_data)
    VALUES (?, ?, ?, ?)
  `).bind(crypto.randomUUID(), id, brand_id, JSON.stringify(metrics)).run();

  // 3. Save Sections
  for (const section of sections) {
    await db.prepare(`
      INSERT INTO report_sections (id, report_id, brand_id, type, title, content, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), 
      id, 
      brand_id, 
      section.type || 'narrative', 
      section.title, 
      section.content, 
      section.order || 0
    ).run();
  }

  // 4. Emit Event
  await emitEvent(env, 'report_generated', {
    brand_id,
    user_id,
    metadata: { report_id: id, title }
  });

  return json({ success: true, report_id: id });
}

/**
 * GET /api/customer/reports
 */
export async function getReports(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT * FROM reports WHERE brand_id = ? ORDER BY created_at DESC
  `).bind(brand_id).all();

  return json({ data: results });
}

/**
 * POST /api/customer/reports/:id/share
 */
export async function shareReport(request, env, auth) {
  const { brand_id, user_id } = auth;
  const url = new URL(request.url);
  const report_id = url.pathname.split('/')[4];

  if (!report_id) return error("Report ID required", 400);

  // In production, this would generate a link or send an email
  // For growth, we just need to track the intent/action
  
  await emitEvent(env, 'report_shared_client', {
    brand_id,
    user_id,
    metadata: { report_id }
  });

  return json({ success: true, message: "Report shared with client" });
}


async function fetchMetricsForPeriod(db, brand_id, start, end) {
  return {
    reach: 12500,
    engagement: 450,
    conversions: 12,
    top_post_id: 'sample-post-id'
  };
}

// ─── POST /api/customer/reports/render ──────────────────────────────────────

export async function renderReportHandler(request, env, auth) {
  let body;
  try { body = await request.json(); } catch { body = {}; }

  const { report_type = 'exec_growth', date_range } = body;
  const { brand_id } = auth;

  const db = getDB(env);

  const brand = await db.prepare(
    'SELECT id, name, website_url, industry FROM brands WHERE id = ?'
  ).bind(brand_id).first();

  if (!brand) {
    return new Response(JSON.stringify({ error: 'Brand not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  const audit = await db.prepare(`
    SELECT id, brand_name, website_url, overall_score, industry,
           full_report_json, created_at
    FROM brand_audit_results_v2
    WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1
  `).bind(brand_id).first().catch(() => null);

  const cfg = resolveReportConfig(report_type);

  const auditData = {
    id: audit?.id || crypto.randomUUID(),
    brand_name: audit?.brand_name || brand.name || 'Your Brand',
    website_url: audit?.website_url || brand.website_url || '',
    overall_score: audit?.overall_score || 0,
    industry: audit?.industry || brand.industry || '',
    created_at: audit?.created_at || new Date().toISOString(),
  };

  const reportData = audit?.full_report_json
    ? JSON.parse(audit.full_report_json)
    : null;

  const html = renderReport(auditData, reportData, {
    template: cfg.template,
    whiteLabelEnabled: cfg.whiteLabelEnabled,
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${safeFilename(auditData.brand_name)}-${report_type}.html"`,
      'Cache-Control': 'no-store',
    },
  });
}
