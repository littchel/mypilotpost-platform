/**
 * myPilotPost — Audit Report (v5 — renderer pipeline)
 * Route handlers only. HTML generation delegated to report_renderer/.
 * Same API surface, same export names, same DB queries — no logic change.
 */

import { getDB } from "../../lib/db.js";
import { renderReport, safeFilename } from "../report_renderer/renderer.js";

export { safeFilename };

// ─── GET /api/public/brand-audit/:id/report ──────────────────────────────────

export async function getPublicAuditReport(request, env) {
  const parts = request.url.split('/');
  const auditId = parts[parts.length - 2];
  const db = getDB(env);

  let audit;
  try {
    audit = await db.prepare(`
      SELECT id, brand_name, website_url, overall_score, industry,
             full_report_json, preview_mode, created_at
      FROM brand_audit_results_v2 WHERE id = ? AND preview_mode = 1
    `).bind(auditId).first();
  } catch {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!audit) {
    return new Response(JSON.stringify({ error: 'Audit not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const report = audit.full_report_json ? JSON.parse(audit.full_report_json) : null;
  const html = renderReport(audit, report, { template: 'executive', whiteLabelEnabled: false });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${safeFilename(audit.brand_name)}-brand-audit.html"`,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}

// ─── GET /api/customer/audit/report/:id ──────────────────────────────────────

export async function getAuditReport(request, env, auth) {
  const parts = request.url.split('/');
  const isPDF = parts[parts.length - 1] === 'pdf';
  const auditId = isPDF ? parts[parts.length - 2] : parts[parts.length - 1];
  const db = getDB(env);

  let audit;
  try {
    audit = await db.prepare(`
      SELECT id, brand_name, website_url, overall_score, industry,
             full_report_json, brand_id, preview_mode, created_at
      FROM brand_audit_results_v2 WHERE id = ?
    `).bind(auditId).first();
  } catch {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!audit) {
    return new Response(JSON.stringify({ error: 'Audit not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (auth.role !== 'admin' && !audit.preview_mode) {
    if (!audit.brand_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const brandCheck = await db.prepare(
      'SELECT 1 FROM brand_users WHERE brand_id = ? AND user_id = ?'
    ).bind(audit.brand_id, auth.user_id).first();
    if (!brandCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const report = audit.full_report_json ? JSON.parse(audit.full_report_json) : null;
  const html = renderReport(audit, report, { template: 'executive', whiteLabelEnabled: false });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${safeFilename(audit.brand_name)}-brand-audit.html"`,
      'Cache-Control': 'no-store',
    },
  });
}

export const getAuditReportPDF = getAuditReport;
