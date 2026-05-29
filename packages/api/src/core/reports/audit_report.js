/**
 * myPilotPost — Audit Reporting Engine (v2)
 * Generates branded HTML reports from brand_audit_results_v2
 */

import { getDB } from "../../lib/db.js";

const SCORE_COLOR = (s) => s >= 70 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';
const SCORE_LABEL = (s) => s >= 70 ? 'Strong' : s >= 50 ? 'Developing' : 'Needs Work';

function buildReportHTML(audit, breakdown, actions, nextSteps, goals, platforms) {
  const score = audit.overall_score || 0;
  const col = SCORE_COLOR(score);
  const label = SCORE_LABEL(score);
  const date = new Date(audit.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const safeName = (audit.brand_name || 'Your Brand').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const dimRows = Object.entries(breakdown).map(([key, val]) => {
    const c = SCORE_COLOR(val);
    const lbl = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `<div class="dr"><span class="dl">${lbl}</span><div class="dbw"><div class="db" style="width:${val}%;background:${c}"></div></div><span class="dv" style="color:${c}">${val}%</span></div>`;
  }).join('');

  const actionCards = actions.slice(0, 5).map((a, i) => `
    <div class="ac">
      <div class="an">${i + 1}</div>
      <div class="ab">
        <div class="am">${(a.metric || 'Strategic Gap').replace(/</g, '&lt;')}</div>
        ${a.cause ? `<p class="aca">${a.cause.replace(/</g, '&lt;')}</p>` : ''}
        ${a.recommendation ? `<div class="ar">${a.recommendation.replace(/</g, '&lt;')}</div>` : ''}
        ${a.expected_outcome ? `<div class="ao">Expected: ${a.expected_outcome.replace(/</g, '&lt;')}</div>` : ''}
      </div>
    </div>`).join('');

  const stepItems = nextSteps.slice(0, 5).map(s => {
    const txt = typeof s === 'string' ? s : (s.action || s.label || '');
    return txt ? `<li class="si"><span class="sb">→</span> ${txt.replace(/</g, '&lt;')}</li>` : '';
  }).join('');

  const goalPills = (goals || []).map(g => `<span class="pill">${g.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>`).join('');
  const platPills = (platforms || []).map(p => `<span class="pill">${p.replace(/\b\w/g, l => l.toUpperCase())}</span>`).join('');

  const scoreDesc = score >= 70
    ? 'Your brand has solid foundations across the key strategic dimensions. With focused execution, you have the platform for accelerated growth.'
    : score >= 50
    ? 'You have genuine potential but key gaps are limiting your reach and authority. A targeted 12-week plan can close these gaps significantly.'
    : 'Significant room to improve across core brand dimensions. This is an opportunity — brands at this stage have the most to gain from focused, consistent execution.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Brand Audit Report — ${safeName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:900px;margin:0 auto;background:#fff;box-shadow:0 0 40px rgba(0,0,0,.08)}
.hdr{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:40px 48px}
.hdr-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
.logo{font-size:20px;font-weight:800;letter-spacing:-.5px}
.logo span{color:#60a5fa}
.badge{background:rgba(255,255,255,.12);padding:5px 14px;border-radius:100px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.ht{font-size:30px;font-weight:800;margin-bottom:6px}
.hm{font-size:13px;color:rgba(255,255,255,.55)}
.hero{padding:40px 48px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:40px}
.sc{width:110px;height:110px;min-width:110px;border-radius:50%;border:7px solid ${col};display:flex;flex-direction:column;align-items:center;justify-content:center}
.sn{font-size:34px;font-weight:900;color:${col};line-height:1}
.sd{font-size:12px;color:#94a3b8;font-weight:700}
.sm h2{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:6px}
.sl{display:inline-block;padding:4px 12px;border-radius:100px;background:${col}20;color:${col};font-size:12px;font-weight:700;margin-bottom:10px}
.sp{font-size:14px;color:#64748b;line-height:1.65;max-width:480px}
.sec{padding:32px 48px;border-bottom:1px solid #f1f5f9}
.st{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:18px}
.dr{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.dl{font-size:13px;font-weight:600;color:#374151;width:200px;flex-shrink:0}
.dbw{flex:1;height:7px;background:#f1f5f9;border-radius:99px;overflow:hidden}
.db{height:100%;border-radius:99px}
.dv{font-size:13px;font-weight:700;width:36px;text-align:right;flex-shrink:0}
.cn{margin-top:14px;padding:11px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;line-height:1.5}
.ac{display:flex;gap:14px;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #f1f5f9;margin-bottom:12px}
.an{width:28px;height:28px;min-width:28px;border-radius:50%;background:#0f172a;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}
.am{font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px}
.aca{font-size:13px;color:#64748b;margin-bottom:6px;line-height:1.5}
.ar{font-size:13px;color:#2563eb;font-weight:600}
.ao{font-size:12px;color:#16a34a;margin-top:4px;font-weight:500}
.sl-list{list-style:none}
.si{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;line-height:1.5}
.sb{color:#2563eb;font-weight:800;flex-shrink:0}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.pill{padding:5px 13px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:100px;font-size:12px;font-weight:600;color:#1d4ed8}
.footer{padding:24px 48px;background:#f8fafc;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center}
.fn{font-size:13px;font-weight:700;color:#64748b}
.fe{font-size:11px;color:#94a3b8}
@media print{body{background:#fff}.page{box-shadow:none;max-width:100%}}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div class="hdr-top">
      <div class="logo">my<span>Pilot</span>Post</div>
      <div class="badge">Brand Audit Report</div>
    </div>
    <div class="ht">${safeName}</div>
    <div class="hm">Generated ${date}${audit.industry ? ' · ' + audit.industry : ''}</div>
  </div>

  <div class="hero">
    <div class="sc">
      <span class="sn">${score}</span>
      <span class="sd">/100</span>
    </div>
    <div class="sm">
      <h2>${safeName}</h2>
      <div class="sl">${label} Brand Presence</div>
      <p class="sp">${scoreDesc}</p>
    </div>
  </div>

  <div class="sec">
    <div class="st">Brand DNA Score™ — Dimension Breakdown</div>
    ${dimRows || '<p style="color:#94a3b8;font-size:14px">Score breakdown not available.</p>'}
    <div class="cn">
      Scores are calculated from a weighted model using your provided brand information and industry benchmarks.
      ${audit.website_url ? '' : ' Adding your website URL in a future audit will improve score accuracy.'}
    </div>
  </div>

  ${actions.length > 0 ? `<div class="sec">
    <div class="st">Priority Actions (Top ${Math.min(5, actions.length)})</div>
    ${actionCards}
  </div>` : ''}

  ${nextSteps.length > 0 ? `<div class="sec">
    <div class="st">Your Next Steps</div>
    <ul class="sl-list">${stepItems}</ul>
  </div>` : ''}

  ${(goals?.length > 0 || platforms?.length > 0) ? `<div class="sec">
    <div class="st">Audit Context</div>
    ${goals?.length > 0 ? `<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Business Goals</div><div class="pills">${goalPills}</div></div>` : ''}
    ${platforms?.length > 0 ? `<div><div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Active Platforms</div><div class="pills">${platPills}</div></div>` : ''}
  </div>` : ''}

  <div class="footer">
    <div class="fn">myPilotPost · Brand Intelligence Platform</div>
    <div class="fe">Confidential · ${date}</div>
  </div>
</div>
</body>
</html>`;
}

function safeFilename(name) {
  return (name || 'brand-audit').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase().slice(0, 60);
}

/**
 * GET /api/public/brand-audit/:id/report
 * Public report download — works for preview_mode audits (pre-registration)
 */
export async function getPublicAuditReport(request, env) {
  const parts = request.url.split('/');
  // Path: /api/public/brand-audit/:id/report  → id is second-to-last segment
  const auditId = parts[parts.length - 2];
  const db = getDB(env);

  let audit;
  try {
    audit = await db.prepare(`
      SELECT id, brand_name, website_url, overall_score, score_breakdown_json,
             strategic_actions_json, next_steps_json, industry, goals_json,
             platforms_json, preview_mode, created_at
      FROM brand_audit_results_v2 WHERE id = ? AND preview_mode = 1
    `).bind(auditId).first();
  } catch {
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  if (!audit) {
    return new Response(JSON.stringify({ error: 'Audit not found' }), { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  const breakdown = JSON.parse(audit.score_breakdown_json || '{}');
  const actions = JSON.parse(audit.strategic_actions_json || '[]');
  const nextSteps = JSON.parse(audit.next_steps_json || '[]');
  const goals = JSON.parse(audit.goals_json || '[]');
  const platforms = JSON.parse(audit.platforms_json || '[]');

  const html = buildReportHTML(audit, breakdown, actions, nextSteps, goals, platforms);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename(audit.brand_name)}-social-media-audit.html"`,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    }
  });
}

/**
 * GET /api/customer/audit/report/:id
 * GET /api/v1/audit/report/:id/pdf   (legacy)
 * Authenticated report download — checks brand ownership
 */
export async function getAuditReport(request, env, auth) {
  const parts = request.url.split('/');
  // Handle /report/:id and /report/:id/pdf
  const isPDF = parts[parts.length - 1] === 'pdf';
  const auditId = isPDF ? parts[parts.length - 2] : parts[parts.length - 1];
  const db = getDB(env);

  let audit;
  try {
    audit = await db.prepare(`
      SELECT id, brand_name, website_url, overall_score, score_breakdown_json,
             strategic_actions_json, next_steps_json, industry, goals_json,
             platforms_json, brand_id, preview_mode, created_at
      FROM brand_audit_results_v2 WHERE id = ?
    `).bind(auditId).first();
  } catch {
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  if (!audit) {
    return new Response(JSON.stringify({ error: 'Audit not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Security: audit must belong to user's brand (or be admin)
  if (auth.role !== 'admin' && !audit.preview_mode) {
    if (!audit.brand_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    const brandCheck = await db.prepare(
      "SELECT 1 FROM brand_users WHERE brand_id = ? AND user_id = ?"
    ).bind(audit.brand_id, auth.user_id).first();
    if (!brandCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const breakdown = JSON.parse(audit.score_breakdown_json || '{}');
  const actions = JSON.parse(audit.strategic_actions_json || '[]');
  const nextSteps = JSON.parse(audit.next_steps_json || '[]');
  const goals = JSON.parse(audit.goals_json || '[]');
  const platforms = JSON.parse(audit.platforms_json || '[]');

  const html = buildReportHTML(audit, breakdown, actions, nextSteps, goals, platforms);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename(audit.brand_name)}-social-media-audit.html"`,
      'Cache-Control': 'no-store',
    }
  });
}

// Legacy alias — same implementation handles both
export const getAuditReportPDF = getAuditReport;
