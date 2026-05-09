// packages/api/src/core/reports/audit_report.js
/**
 * myPilotPost — Audit Reporting Engine
 * ACTIONABLE • PRODUCTION-GRADE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/v1/audit/report/:id
 */
export async function getAuditReport(request, env, auth) {
  const auditId = request.url.split("/").pop();
  const db = getDB(env);

  const audit = await db.prepare(`
    SELECT * FROM brand_audit_results WHERE id = ?
  `).bind(auditId).first();

  if (!audit) return error("Audit not found", "NOT_FOUND", null, 404);

  // Security check: ensure audit belongs to user's brand (unless admin)
  if (auth.role !== 'admin') {
    const brandCheck = await db.prepare("SELECT 1 FROM brand_users WHERE brand_id = ? AND user_id = ?")
      .bind(audit.brand_id, auth.user_id).first();
    if (!brandCheck) return error("Forbidden", "FORBIDDEN", null, 403);
  }

  const scores = JSON.parse(audit.scores_json);
  const actions = JSON.parse(audit.recommendations_json);
  const weeklyFixes = JSON.parse(audit.weekly_fixes_json);

  // Return as clean JSON (Frontend will render HTML or PDF-like view)
  return json({
    id: audit.id,
    generated_at: audit.created_at,
    scores,
    recommended_plan: audit.recommended_plan,
    strategic_actions: actions, // Contains enriched tactical_fixes
    weekly_tactical_fixes: weeklyFixes,
    summary: audit.summary || `Your brand health is currently at ${scores.consistency}% consistency. ${audit.recommended_plan === 'pro' ? 'Immediate scaling recommended.' : 'Focus on foundational growth.'}`
  });
}
/**
 * GET /api/v1/audit/report/:id/pdf
 */
export async function getAuditReportPDF(request, env, auth) {
  const auditId = request.url.split("/").slice(-2)[0];
  const db = getDB(env);

  const audit = await db.prepare(`
    SELECT * FROM brand_audit_results WHERE id = ?
  `).bind(auditId).first();

  if (!audit) return error("Audit not found", "NOT_FOUND", null, 404);

  const scores = JSON.parse(audit.scores_json);
  const actions = JSON.parse(audit.recommendations_json);
  const summary = audit.summary;

  // Simple HTML Template for PDF
  const html = `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 40px; }
          .score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
          .score-card { background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; }
          .score-val { font-size: 24px; font-weight: bold; color: #2563eb; }
          .fix-card { margin-bottom: 20px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .impact-high { color: #dc2626; font-weight: bold; }
          .plan-box { background: #eff6ff; padding: 20px; border-radius: 12px; border: 1px solid #2563eb; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Brand Audit Report</h1>
          <p>Generated on ${new Date(audit.created_at).toLocaleDateString()}</p>
        </div>
        
        <div class="score-grid">
          <div class="score-card"><div class="score-val">${scores.content}%</div><div>Content</div></div>
          <div class="score-card"><div class="score-val">${scores.consistency}%</div><div>Consistency</div></div>
          <div class="score-card"><div class="score-val">${scores.growth}%</div><div>Growth</div></div>
        </div>

        <h3>Executive Summary</h3>
        <p>${summary}</p>

        <h3>Tactical Fixes</h3>
        ${actions.map(a => `
          <div class="fix-card">
            <strong>${a.title}</strong> <span class="impact-${a.impact.toLowerCase()}">(${a.impact} Impact)</span>
            <p><em>Issue:</em> ${a.issue}</p>
            <p><strong>Fix:</strong> ${a.fix}</p>
          </div>
        `).join('')}

        <div class="plan-box">
          <h3>Recommended Growth Plan: ${audit.recommended_plan.toUpperCase()}</h3>
          <p>Upgrade to this plan to unlock the automated tools required for these fixes.</p>
        </div>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html", // Worker PDF simulation
      "Content-Disposition": `attachment; filename=brand-audit-${auditId}.html`
    }
  });
}
