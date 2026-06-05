/**
 * myPilotPost — Reporting Engine
 * AUTHORITATIVE • SYSTEM CORE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";
import { renderReport, safeFilename } from "../report_renderer/renderer.js";
import { resolveReportConfig } from "../report_registry.js";
import { emit, TOOLS, EVENTS } from "../events/emit.js";

/**
 * POST /api/customer/reports
 * Save a report configuration snapshot to history.
 */
export async function createReport(request, env, auth) {
  const { brand_id, user_id } = auth;
  const body = await request.json();
  const { title, date_range_start, date_range_end, report_type, template_id, sections = [] } = body;

  if (!title || !date_range_start || !date_range_end) {
    return error("Title and date range required", "BAD_REQUEST", null, 400);
  }

  const db = getDB(env);

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO reports (id, brand_id, title, date_range_start, date_range_end, created_by, report_type, template_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, brand_id, title, date_range_start, date_range_end, user_id, report_type || 'monthly', template_id || 1).run();

  const metrics = await fetchMetricsForPeriod(db, brand_id, date_range_start, date_range_end);

  await db.prepare(`
    INSERT INTO report_snapshots (id, report_id, brand_id, snapshot_data)
    VALUES (?, ?, ?, ?)
  `).bind(crypto.randomUUID(), id, brand_id, JSON.stringify(metrics)).run();

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

  await emitEvent(env, 'report_generated', {
    brand_id,
    user_id,
    metadata: { report_id: id, title }
  });

  emit(env, { tool: TOOLS.REPORTS, event: EVENTS.REPORT_OPENED, brandId: brand_id, userId: user_id });
  return json({ success: true, report_id: id });
}

/**
 * GET /api/customer/reports
 */
export async function getReports(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(
    'SELECT * FROM reports WHERE brand_id = ? ORDER BY created_at DESC'
  ).bind(brand_id).all();

  return json({ data: results });
}

/**
 * POST /api/customer/reports/:id/share
 * Track a share event and return a channel-appropriate share URL.
 */
export async function shareReport(request, env, auth) {
  const { brand_id, user_id } = auth;
  const url = new URL(request.url);
  const report_id = url.pathname.split('/')[4];

  let body = {};
  try { body = await request.json(); } catch { /* empty */ }
  const { channel = 'link' } = body;

  if (!report_id) return error("Report ID required", "BAD_REQUEST", null, 400);

  await emitEvent(env, 'report_shared_client', {
    brand_id,
    user_id,
    metadata: { report_id, channel }
  });

  emit(env, { tool: TOOLS.REPORTS, event: EVENTS.REPORT_OPENED, brandId: brand_id, userId: user_id });

  const base = env.FRONTEND_URL || 'https://app.mypilotpost.com';
  return json({ success: true, share_url: `${base}/dashboard/reporting?report=${report_id}`, channel });
}

async function fetchMetricsForPeriod(db, brand_id, start, end) {
  return {
    reach: 12500,
    engagement: 450,
    conversions: 12,
    top_post_id: 'sample-post-id',
  };
}

// ─── POST /api/customer/reports/render ──────────────────────────────────────

/**
 * Render a report to self-contained HTML via the report_renderer engine.
 *
 * Body params:
 *   report_type      — one of the 12 registry keys (default: exec_growth)
 *   template_override — override registry template: executive|agency|internal|white_label
 *   white_label_config — { client_name, client_url, primary_color, footer_text }
 *   date_range       — informational string; not yet used in renderer data
 */
export async function renderReportHandler(request, env, auth) {
  let body;
  try { body = await request.json(); } catch { body = {}; }

  const {
    report_type = 'exec_growth',
    date_range,
    template_override,
    white_label_config,
  } = body;

  const { brand_id, user_id } = auth;
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

  // Registry resolves the default template; template_override takes precedence
  const cfg = resolveReportConfig(report_type);
  const template = template_override || cfg.template;
  const whiteLabelEnabled = white_label_config != null ? true : cfg.whiteLabelEnabled;

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
    template,
    whiteLabelEnabled,
    clientName: white_label_config?.client_name || '',
    clientUrl: white_label_config?.client_url || '',
    clientAccent: white_label_config?.primary_color || '',
  });

  emit(env, { tool: TOOLS.REPORTS, event: EVENTS.REPORT_OPENED, brandId: brand_id, userId: user_id });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${safeFilename(auditData.brand_name)}-${report_type}.html"`,
      'Cache-Control': 'no-store',
    },
  });
}
