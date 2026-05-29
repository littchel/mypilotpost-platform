/**
 * myPilotPost — Audit Report Builder (v4 — Groq-Driven)
 * Generates HTML reports from full_report_json (Groq AI output).
 * All 13 sections rendered. Print to PDF via browser — no email gate.
 */

import { getDB } from "../../lib/db.js";

const SC = (s) => s >= 70 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';
const SL = (s) => s >= 70 ? 'Strong' : s >= 50 ? 'Developing' : 'Needs Work';

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeList(items) {
  if (!items?.length) return '<li class="na-item">No data available</li>';
  return items.map(s => `<li>${esc(s)}</li>`).join('');
}

function secHeader(title) {
  return `<div class="sec-label">${esc(title)}</div>`;
}

function roadmapCards(items, color) {
  if (!items?.length) return '<p class="na-text">None identified.</p>';
  return items.map(item => `
    <div class="rm-card" style="border-left-color:${color}">
      <div class="rm-action">${esc(item.action)}</div>
      ${item.references_issue ? `<div class="rm-ref">Addresses: ${esc(item.references_issue)}</div>` : ''}
      ${item.business_impact ? `<div class="rm-impact">${esc(item.business_impact)}</div>` : ''}
      ${item.expected_outcome ? `<div class="rm-outcome">Expected: ${esc(item.expected_outcome)}</div>` : ''}
      <div class="rm-time">${esc(item.timeframe || '')}</div>
    </div>`).join('');
}

function dimBar(key, val) {
  const c = SC(val);
  const lbl = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `<div class="dr"><span class="dl">${lbl}</span><div class="dbw"><div class="db" style="width:${val}%;background:${c}"></div></div><span class="dv" style="color:${c}">${val}</span></div>`;
}

function mixBar(key, val) {
  const lbl = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `<div class="dr"><span class="dl">${lbl}</span><div class="dbw"><div class="db" style="width:${val}%;background:#3b82f6"></div></div><span class="dv" style="color:#64748b">${val}%</span></div>`;
}

function buildReportHTML(audit, report) {
  const score = audit.overall_score || report?.brand_score?.overall || 0;
  const col = SC(score);
  const label = SL(score);
  const date = new Date(audit.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const safeName = esc(audit.brand_name || 'Your Brand');
  const safeIndustry = esc(audit.industry || '');

  const bs = report?.brand_score || {};
  const bp = report?.business_profile || {};
  const ds = report?.diagnostic_snapshot || {};
  const spr = report?.social_presence_review || {};
  const bir = report?.brand_identity_review || {};
  const cga = report?.content_genome_analysis || {};
  const arr = report?.audience_resonance_review || {};
  const cmm = report?.competitive_moat_map || {};
  const car = report?.conversion_architecture_review || {};
  const swot = report?.swot || {};
  const rm = report?.strategic_roadmap || {};
  const gf = report?.growth_forecast || {};
  const ac = report?.audit_confidence || {};
  const uvi = report?.unlock_verified_intelligence || {};

  const dimBars = Object.entries(bs.dimensions || {}).map(([k, v]) => dimBar(k, v)).join('');
  const mixBars = Object.entries(cga.estimated_content_mix || {}).map(([k, v]) => mixBar(k, v)).join('');

  const platformsTable = (spr.platforms_found || []).length
    ? `<table class="pt">
        <thead><tr><th>Platform</th><th>URL</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
        ${(spr.platforms_found || []).map(p => {
          const sc = p.status === 'active' ? '#16a34a' : p.status === 'inactive' ? '#d97706' : '#94a3b8';
          const sb = p.status === 'active' ? '#f0fdf4' : p.status === 'inactive' ? '#fff7ed' : '#f8fafc';
          return `<tr>
            <td class="pt-name">${esc(p.platform || '')}</td>
            <td class="pt-url">${p.url && p.url !== 'not found' ? `<a href="${esc(p.url)}" target="_blank">${esc(p.url)}</a>` : '<span class="na-text">not found</span>'}</td>
            <td><span class="pt-badge" style="color:${sc};background:${sb}">${esc(p.status || 'unknown')}</span></td>
            <td class="pt-notes">${esc(p.notes || '')}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>`
    : '<p class="na-text">No platform data available.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Social Media Brand Audit — ${safeName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f4f8;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:13px}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}
.page{max-width:1000px;margin:0 auto;background:#fff;box-shadow:0 0 60px rgba(0,0,0,.12)}

/* ─── Header ─────────────────────────────────── */
.hdr{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f172a 100%);color:#fff;padding:36px 48px 32px}
.hdr-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.logo{font-size:18px;font-weight:900;letter-spacing:-.5px}
.logo span{color:#60a5fa}
.badge{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);padding:5px 14px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em}
.hdr-name{font-size:28px;font-weight:900;margin-bottom:4px;line-height:1.15}
.hdr-ind{font-size:13px;color:rgba(255,255,255,.6);margin-bottom:2px}
.hdr-date{font-size:11px;color:rgba(255,255,255,.38)}

/* ─── Hero / Score ───────────────────────────── */
.hero{padding:36px 48px;border-bottom:1px solid #e8edf5;display:flex;gap:40px;align-items:flex-start}
.score-ring-wrap{flex-shrink:0;text-align:center}
.score-ring{width:120px;height:120px;border-radius:50%;border:8px solid ${col};display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:8px}
.score-num{font-size:36px;font-weight:900;color:${col};line-height:1}
.score-denom{font-size:11px;color:#94a3b8;font-weight:700}
.score-label{display:inline-block;padding:3px 12px;border-radius:100px;background:${col}18;color:${col};font-size:11px;font-weight:700}
.hero-body{flex:1}
.hero-rationale{font-size:14px;color:#334155;line-height:1.7;margin-bottom:18px}
.dr{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.dl{font-size:12px;font-weight:600;color:#374151;width:180px;flex-shrink:0}
.dbw{flex:1;height:6px;background:#f1f5f9;border-radius:99px;overflow:hidden}
.db{height:100%;border-radius:99px;transition:width .3s}
.dv{font-size:12px;font-weight:700;width:32px;text-align:right;flex-shrink:0}

/* ─── Sections ───────────────────────────────── */
.sec{padding:28px 48px;border-bottom:1px solid #e8edf5}
.sec:last-child{border-bottom:none}
.sec-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin-bottom:16px}
.sec-title{font-size:15px;font-weight:800;color:#0f172a;margin-bottom:12px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.four-col{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px}
p.body{font-size:13px;color:#334155;line-height:1.7;margin-bottom:10px}
.na-text{font-size:12px;color:#94a3b8;font-style:italic}
.na-item{color:#94a3b8;font-style:italic}

/* ─── Business Profile ───────────────────────── */
.bp-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e8edf5;border-radius:10px;overflow:hidden}
.bp-row{display:flex;border-bottom:1px solid #f1f5f9}
.bp-row:last-child{border-bottom:none}
.bp-key{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;padding:10px 14px;background:#fafbfc;width:140px;flex-shrink:0;border-right:1px solid #f1f5f9;display:flex;align-items:center}
.bp-val{font-size:12px;color:#334155;padding:10px 14px;line-height:1.5;flex:1}
.bp-col{border-right:1px solid #e8edf5}
.bp-col:last-child{border-right:none}
.bp-evidence{font-size:12px;color:#64748b;line-height:1.6;padding:12px 14px;background:#fafbfc;border-radius:8px;margin-top:14px;border-left:3px solid #e2e8f0;font-style:italic}

/* ─── Diagnostic Snapshot ────────────────────── */
.diag-summary{font-size:13px;color:#334155;line-height:1.75;padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e8edf5;margin-bottom:20px}
.diag-positioning{font-size:12px;color:#475569;line-height:1.65;padding:12px 14px;background:#eff6ff;border-radius:8px;border-left:3px solid #3b82f6;margin-bottom:20px}
.diag-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.diag-card{border-radius:10px;padding:14px;border:1px solid}
.diag-s{background:#f0fdf4;border-color:#bbf7d0}
.diag-w{background:#fff7ed;border-color:#fed7aa}
.diag-r{background:#fef2f2;border-color:#fecaca}
.diag-o{background:#f5f3ff;border-color:#ddd6fe}
.diag-card-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
.diag-s .diag-card-label{color:#16a34a}
.diag-w .diag-card-label{color:#d97706}
.diag-r .diag-card-label{color:#dc2626}
.diag-o .diag-card-label{color:#7c3aed}
.diag-card ul{list-style:none;padding:0}
.diag-card ul li{font-size:11px;color:#374151;line-height:1.55;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.diag-card ul li:last-child{border-bottom:none}

/* ─── Social Platforms ───────────────────────── */
.pt{width:100%;border-collapse:collapse;margin-bottom:14px}
.pt th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;padding:8px 12px;background:#fafbfc;border-bottom:1px solid #e8edf5;text-align:left}
.pt td{font-size:12px;padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
.pt tr:last-child td{border-bottom:none}
.pt-name{font-weight:700;text-transform:capitalize;color:#0f172a;white-space:nowrap}
.pt-url a{color:#2563eb;font-size:11px;word-break:break-all}
.pt-badge{display:inline-block;padding:2px 9px;border-radius:100px;font-size:10px;font-weight:700;text-transform:capitalize;white-space:nowrap}
.pt-notes{color:#64748b;font-size:11px;max-width:260px;line-height:1.5}
.sp-missing{font-size:12px;color:#64748b;line-height:1.6;padding:12px 14px;background:#fff7ed;border-radius:8px;border-left:3px solid #f59e0b;margin-top:12px}
.sp-opps ul,.sp-missing-list{padding:0 0 0 16px;color:#374151}
.sp-opps ul li,.sp-missing-list li{font-size:12px;line-height:1.6;margin-bottom:4px}

/* ─── Brand Identity ─────────────────────────── */
.bi-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.bi-item{padding:12px 14px;border-radius:8px;background:#fafbfc;border:1px solid #e8edf5}
.bi-key{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:6px}
.bi-val{font-size:12px;color:#334155;line-height:1.55}

/* ─── Content Genome ─────────────────────────── */
.cga-obs{font-size:12px;color:#334155;line-height:1.65;padding:12px 14px;background:#fafbfc;border-radius:8px;border:1px solid #e8edf5;margin-top:14px}
.cga-basis{font-size:11px;color:#64748b;font-style:italic;margin-bottom:14px}
.theme-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.theme-pill{padding:4px 11px;border-radius:100px;font-size:11px;font-weight:600}
.theme-strong{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
.theme-weak{background:#fff7ed;color:#b45309;border:1px solid #fde68a}
.theme-miss{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}

/* ─── Audience Resonance ─────────────────────── */
.arr-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px}
.arr-card{padding:12px 14px;background:#fafbfc;border-radius:8px;border:1px solid #e8edf5}
.arr-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:6px}
.arr-val{font-size:12px;color:#334155;line-height:1.55}
.arr-opps ul{padding:0 0 0 16px}
.arr-opps ul li{font-size:12px;color:#374151;line-height:1.6;margin-bottom:4px}

/* ─── Competitive Moat ───────────────────────── */
.cmm-overview{font-size:12px;color:#334155;line-height:1.65;padding:12px 14px;background:#fafbfc;border-radius:8px;border:1px solid #e8edf5;margin-bottom:16px}
.gap-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px}
.gap-card{padding:12px 14px;border-radius:8px;border:1px solid}
.gap-overlap{background:#eff6ff;border-color:#bfdbfe}
.gap-auth{background:#fff7ed;border-color:#fed7aa}
.gap-content{background:#fef2f2;border-color:#fecaca}
.gap-white{background:#f5f3ff;border-color:#ddd6fe}
.gap-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}
.gap-overlap .gap-label{color:#2563eb}
.gap-auth .gap-label{color:#d97706}
.gap-content .gap-label{color:#dc2626}
.gap-white .gap-label{color:#7c3aed}
.gap-card ul{list-style:none;padding:0}
.gap-card ul li{font-size:11px;color:#374151;line-height:1.55;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.gap-card ul li:last-child{border-bottom:none}

/* ─── Conversion Architecture ────────────────── */
.conv-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.conv-card{padding:12px 14px;background:#fafbfc;border-radius:8px;border:1px solid #e8edf5}
.conv-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:6px}
.conv-val{font-size:12px;color:#334155;line-height:1.55}
.conv-issues{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.conv-friction,.conv-trust-gaps,.conv-cta-weak,.conv-opps{padding:12px 14px;border-radius:8px;border:1px solid}
.conv-friction{background:#fef2f2;border-color:#fecaca}
.conv-trust-gaps{background:#fff7ed;border-color:#fed7aa}
.conv-cta-weak{background:#fffbeb;border-color:#fde68a}
.conv-opps{background:#f0fdf4;border-color:#bbf7d0}
.conv-friction .conv-label{color:#dc2626}
.conv-trust-gaps .conv-label{color:#d97706}
.conv-cta-weak .conv-label{color:#b45309}
.conv-opps .conv-label{color:#16a34a}
.conv-friction ul,.conv-trust-gaps ul,.conv-cta-weak ul,.conv-opps ul{list-style:none;padding:0}
.conv-friction ul li,.conv-trust-gaps ul li,.conv-cta-weak ul li,.conv-opps ul li{font-size:11px;color:#374151;line-height:1.55;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.conv-friction ul li:last-child,.conv-trust-gaps ul li:last-child,.conv-cta-weak ul li:last-child,.conv-opps ul li:last-child{border-bottom:none}

/* ─── SWOT ───────────────────────────────────── */
.swot-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.swot-cell{padding:16px;border-radius:10px;border:1px solid}
.swot-s{background:#f0fdf4;border-color:#bbf7d0}
.swot-w{background:#fff7ed;border-color:#fed7aa}
.swot-o{background:#eff6ff;border-color:#bfdbfe}
.swot-t{background:#fef2f2;border-color:#fecaca}
.swot-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
.swot-s .swot-label{color:#16a34a}
.swot-w .swot-label{color:#d97706}
.swot-o .swot-label{color:#2563eb}
.swot-t .swot-label{color:#dc2626}
.swot-cell ul{list-style:none;padding:0}
.swot-cell ul li{font-size:12px;color:#374151;line-height:1.55;padding:4px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.swot-cell ul li:last-child{border-bottom:none}

/* ─── Strategic Roadmap ──────────────────────── */
.rm-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.rm-col{border-radius:10px;overflow:hidden;border:1px solid #e8edf5}
.rm-col-header{padding:12px 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;justify-content:space-between}
.rm-qw-h{background:#f0fdf4;color:#16a34a}
.rm-gp-h{background:#eff6ff;color:#2563eb}
.rm-si-h{background:#f5f3ff;color:#7c3aed}
.rm-time-badge{font-size:9px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;font-weight:500}
.rm-col-body{padding:0}
.rm-card{padding:12px 14px;border-bottom:1px solid #f1f5f9;border-left:3px solid transparent}
.rm-card:last-child{border-bottom:none}
.rm-action{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:4px;line-height:1.45}
.rm-ref{font-size:10px;color:#94a3b8;margin-bottom:3px;font-style:italic}
.rm-impact{font-size:11px;color:#475569;line-height:1.5;margin-bottom:3px}
.rm-outcome{font-size:11px;color:#16a34a;font-weight:600;margin-bottom:3px}
.rm-time{font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.04em}

/* ─── Growth Forecast ────────────────────────── */
.gf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.gf-card{padding:12px 14px;background:#fafbfc;border-radius:8px;border:1px solid #e8edf5}
.gf-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:8px}
.gf-card ul{list-style:none;padding:0}
.gf-card ul li{font-size:11px;color:#334155;line-height:1.55;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.gf-card ul li:last-child{border-bottom:none}
.gf-assumptions{font-size:11px;color:#64748b;font-style:italic;padding:10px 12px;background:#f1f5f9;border-radius:8px;line-height:1.6}

/* ─── Audit Confidence ───────────────────────── */
.ac-sec{background:#fafbfc}
.ac-quality{font-size:13px;color:#334155;line-height:1.7;padding:12px 14px;background:#fff;border:1px solid #e8edf5;border-radius:8px;margin-bottom:16px}
.ac-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px}
.ac-col{padding:12px 14px;border-radius:8px;border:1px solid}
.ac-obs{background:#f0fdf4;border-color:#bbf7d0}
.ac-inf{background:#eff6ff;border-color:#bfdbfe}
.ac-est{background:#fffbeb;border-color:#fde68a}
.ac-col-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}
.ac-obs .ac-col-label{color:#16a34a}
.ac-inf .ac-col-label{color:#2563eb}
.ac-est .ac-col-label{color:#b45309}
.ac-col ul{list-style:none;padding:0}
.ac-col ul li{font-size:11px;color:#374151;line-height:1.55;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.ac-col ul li:last-child{border-bottom:none}
.ac-limitations{font-size:12px;color:#64748b;line-height:1.65;padding:12px 14px;background:#fff;border:1px solid #e8edf5;border-radius:8px;border-left:3px solid #94a3b8}
.ac-framework{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}
.ac-fw-item{font-size:11px;color:#64748b;padding:5px 10px;background:#fff;border:1px solid #e8edf5;border-radius:6px}
.ac-fw-item strong{color:#374151}

/* ─── Unlock ─────────────────────────────────── */
.unlock-sec{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:32px 48px}
.unlock-sec .sec-label{color:rgba(255,255,255,.45)}
.unlock-intro{font-size:13px;color:rgba(255,255,255,.75);line-height:1.65;margin-bottom:20px}
.unlock-vp{font-size:14px;color:#93c5fd;font-weight:700;margin-bottom:20px;font-style:italic;line-height:1.5}
.unlock-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
.unlock-item{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:14px;font-size:11px;color:rgba(255,255,255,.8);line-height:1.55}
.unlock-item strong{display:block;color:#fff;font-size:12px;margin-bottom:4px}
.unlock-item span{display:block;font-size:11px;color:rgba(255,255,255,.65)}
.unlock-cta{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:14px 18px;font-size:13px;color:rgba(255,255,255,.9);line-height:1.6}
.unlock-cta strong{color:#fff}
.unlock-url{color:#60a5fa;font-weight:700}

/* ─── Footer ─────────────────────────────────── */
.footer{padding:20px 48px;background:#f8fafc;border-top:1px solid #e8edf5;display:flex;justify-content:space-between;align-items:center}
.footer-brand{font-size:13px;font-weight:700;color:#64748b}
.footer-note{font-size:11px;color:#94a3b8}

/* ─── Print ──────────────────────────────────── */
@media print {
  body{background:#fff;font-size:11px}
  .page{box-shadow:none;max-width:100%}
  .hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .unlock-sec{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .swot-grid,.rm-grid,.diag-grid,.gap-grid,.gf-grid,.ac-grid,.unlock-grid,.arr-grid,.bi-grid,.two-col,.conv-cards,.conv-issues{break-inside:avoid}
  .sec{break-inside:avoid;padding:20px 40px}
  .hdr{padding:28px 40px 24px}
  .hero{padding:24px 40px}
  .unlock-sec{padding:24px 40px}
  .footer{padding:14px 40px}
}

/* ─── Section break hint ─────────────────────── */
.page-break{page-break-before:always}
</style>
</head>
<body>
<div class="page">

  <!-- ── Header ─────────────────────────────── -->
  <div class="hdr">
    <div class="hdr-top">
      <div class="logo">my<span>Pilot</span>Post</div>
      <div class="badge">Social Media Brand Audit</div>
    </div>
    <div class="hdr-name">${safeName}</div>
    ${safeIndustry ? `<div class="hdr-ind">${safeIndustry}${bp.niche ? ` · ${esc(bp.niche)}` : ''}</div>` : ''}
    <div class="hdr-date">Generated ${date}${audit.website_url ? ` · ${esc(audit.website_url)}` : ''}</div>
  </div>

  <!-- ── Brand Score ────────────────────────── -->
  <div class="hero">
    <div class="score-ring-wrap">
      <div class="score-ring">
        <span class="score-num">${score}</span>
        <span class="score-denom">/100</span>
      </div>
      <div class="score-label">${label}</div>
    </div>
    <div class="hero-body">
      ${bs.rationale ? `<p class="hero-rationale">${esc(bs.rationale)}</p>` : ''}
      ${dimBars || '<p class="na-text">Score dimensions not available.</p>'}
    </div>
  </div>

  <!-- ── 1. Business Profile ────────────────── -->
  <div class="sec">
    ${secHeader('1 · Business Profile')}
    <div class="bp-grid">
      <div class="bp-col">
        ${bp.business_model ? `<div class="bp-row"><span class="bp-key">Business Model</span><span class="bp-val">${esc(bp.business_model)}</span></div>` : ''}
        ${bp.target_audience ? `<div class="bp-row"><span class="bp-key">Target Audience</span><span class="bp-val">${esc(bp.target_audience)}</span></div>` : ''}
        ${bp.primary_offer ? `<div class="bp-row"><span class="bp-key">Primary Offer</span><span class="bp-val">${esc(bp.primary_offer)}</span></div>` : ''}
      </div>
      <div>
        ${bp.geographic_market ? `<div class="bp-row"><span class="bp-key">Market</span><span class="bp-val">${esc(bp.geographic_market)}</span></div>` : ''}
        ${bp.secondary_offers?.length ? `<div class="bp-row"><span class="bp-key">Other Offers</span><span class="bp-val">${bp.secondary_offers.map(esc).join(', ')}</span></div>` : ''}
        ${bp.confidence ? `<div class="bp-row"><span class="bp-key">Confidence</span><span class="bp-val" style="text-transform:capitalize">${esc(bp.confidence)}</span></div>` : ''}
      </div>
    </div>
    ${bp.evidence ? `<div class="bp-evidence">Evidence: ${esc(bp.evidence)}</div>` : ''}
  </div>

  <!-- ── 2. Diagnostic Snapshot ─────────────── -->
  <div class="sec">
    ${secHeader('2 · Diagnostic Snapshot')}
    ${ds.executive_summary ? `<div class="diag-summary">${esc(ds.executive_summary)}</div>` : ''}
    ${ds.brand_positioning_assessment ? `<div class="diag-positioning">${esc(ds.brand_positioning_assessment)}</div>` : ''}
    <div class="diag-grid">
      <div class="diag-card diag-s">
        <div class="diag-card-label">Strategic Strengths</div>
        <ul>${safeList(ds.strategic_strengths)}</ul>
      </div>
      <div class="diag-card diag-w">
        <div class="diag-card-label">Strategic Weaknesses</div>
        <ul>${safeList(ds.strategic_weaknesses)}</ul>
      </div>
      <div class="diag-card diag-r">
        <div class="diag-card-label">Strategic Risks</div>
        <ul>${safeList(ds.strategic_risks)}</ul>
      </div>
      <div class="diag-card diag-o">
        <div class="diag-card-label">Growth Opportunities</div>
        <ul>${safeList(ds.growth_opportunities)}</ul>
      </div>
    </div>
  </div>

  <!-- ── 3. Social Presence Review ─────────────────── -->
  <div class="sec">
    ${secHeader('3 · Social Presence Review')}
    ${platformsTable}
    ${spr.profile_quality_review ? `<p class="body">${esc(spr.profile_quality_review)}</p>` : ''}
    ${spr.bio_review ? `<p class="body"><strong>Bio Review:</strong> ${esc(spr.bio_review)}</p>` : ''}
    ${spr.platforms_missing?.length ? `<div class="sp-missing"><strong>Missing Platforms:</strong><ul class="sp-missing-list" style="margin-top:6px">${safeList(spr.platforms_missing)}</ul></div>` : ''}
    ${spr.platform_opportunities?.length ? `<div class="sp-opps" style="margin-top:12px"><strong style="font-size:12px;color:#374151">Platform Opportunities</strong><ul style="margin-top:6px">${safeList(spr.platform_opportunities)}</ul></div>` : ''}
  </div>

  <!-- ── 4. Brand Identity Review ──────────── -->
  <div class="sec">
    ${secHeader('4 · Brand Identity Review')}
    <div class="bi-grid">
      ${bir.logo_assessment ? `<div class="bi-item"><div class="bi-key">Logo Assessment</div><div class="bi-val">${esc(bir.logo_assessment)}</div></div>` : ''}
      ${bir.colour_consistency ? `<div class="bi-item"><div class="bi-key">Colour Consistency</div><div class="bi-val">${esc(bir.colour_consistency)}</div></div>` : ''}
      ${bir.typography_consistency ? `<div class="bi-item"><div class="bi-key">Typography</div><div class="bi-val">${esc(bir.typography_consistency)}</div></div>` : ''}
      ${bir.visual_identity_consistency ? `<div class="bi-item"><div class="bi-key">Visual Consistency</div><div class="bi-val">${esc(bir.visual_identity_consistency)}</div></div>` : ''}
    </div>
    ${bir.trust_signal_assessment ? `<div class="bp-evidence" style="margin-top:12px">Trust Signals: ${esc(bir.trust_signal_assessment)}</div>` : ''}
  </div>

  <!-- ── 5. Content Genome Analysis ────────── -->
  <div class="sec">
    ${secHeader('5 · Content Genome Analysis')}
    ${cga.mix_basis ? `<p class="cga-basis">${esc(cga.mix_basis)}</p>` : ''}
    ${mixBars || ''}
    ${cga.content_observations ? `<div class="cga-obs">${esc(cga.content_observations)}</div>` : ''}
    <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:16px">
      ${cga.strongest_themes?.length ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#16a34a;margin-bottom:6px">Strongest Themes</div><div class="theme-pills">${(cga.strongest_themes || []).map(t => `<span class="theme-pill theme-strong">${esc(t)}</span>`).join('')}</div></div>` : ''}
      ${cga.weakest_themes?.length ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#d97706;margin-bottom:6px">Weakest Themes</div><div class="theme-pills">${(cga.weakest_themes || []).map(t => `<span class="theme-pill theme-weak">${esc(t)}</span>`).join('')}</div></div>` : ''}
      ${cga.missing_themes?.length ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#dc2626;margin-bottom:6px">Missing Themes</div><div class="theme-pills">${(cga.missing_themes || []).map(t => `<span class="theme-pill theme-miss">${esc(t)}</span>`).join('')}</div></div>` : ''}
    </div>
  </div>

  <!-- ── 6. Audience Resonance Review ──────── -->
  <div class="sec">
    ${secHeader('6 · Audience Resonance Review')}
    <div class="arr-grid">
      ${arr.audience_alignment ? `<div class="arr-card"><div class="arr-label">Audience Alignment</div><div class="arr-val">${esc(arr.audience_alignment)}</div></div>` : ''}
      ${arr.messaging_effectiveness ? `<div class="arr-card"><div class="arr-label">Messaging Effectiveness</div><div class="arr-val">${esc(arr.messaging_effectiveness)}</div></div>` : ''}
      ${arr.value_proposition_assessment ? `<div class="arr-card"><div class="arr-label">Value Proposition</div><div class="arr-val">${esc(arr.value_proposition_assessment)}</div></div>` : ''}
    </div>
    ${arr.trust_building_opportunities?.length ? `<div class="arr-opps"><strong style="font-size:11px;color:#374151;text-transform:uppercase;letter-spacing:.06em">Trust-Building Opportunities</strong><ul style="margin-top:6px">${safeList(arr.trust_building_opportunities)}</ul></div>` : ''}
  </div>

  <!-- ── 7. Competitive Moat Map ────────────── -->
  <div class="sec page-break">
    ${secHeader('7 · Competitive Moat Map')}
    ${cmm.competitor_overview ? `<div class="cmm-overview">${esc(cmm.competitor_overview)}</div>` : ''}
    <div class="gap-grid">
      ${cmm.positioning_overlaps?.length ? `<div class="gap-card gap-overlap"><div class="gap-label">Positioning Overlaps</div><ul>${safeList(cmm.positioning_overlaps)}</ul></div>` : ''}
      ${cmm.authority_gaps?.length ? `<div class="gap-card gap-auth"><div class="gap-label">Authority Gaps</div><ul>${safeList(cmm.authority_gaps)}</ul></div>` : ''}
      ${cmm.content_gaps?.length ? `<div class="gap-card gap-content"><div class="gap-label">Content Gaps</div><ul>${safeList(cmm.content_gaps)}</ul></div>` : ''}
      ${cmm.whitespace_opportunities?.length ? `<div class="gap-card gap-white"><div class="gap-label">Whitespace Opportunities</div><ul>${safeList(cmm.whitespace_opportunities)}</ul></div>` : ''}
    </div>
  </div>

  <!-- ── 8. Conversion Architecture Review ─── -->
  <div class="sec">
    ${secHeader('8 · Conversion Architecture Review')}
    <div class="conv-cards">
      ${car.website_assessment ? `<div class="conv-card"><div class="conv-label">Website Assessment</div><div class="conv-val">${esc(car.website_assessment)}</div></div>` : ''}
      ${car.landing_page_assessment ? `<div class="conv-card"><div class="conv-label">Landing Page</div><div class="conv-val">${esc(car.landing_page_assessment)}</div></div>` : ''}
      ${car.lead_capture_assessment ? `<div class="conv-card"><div class="conv-label">Lead Capture</div><div class="conv-val">${esc(car.lead_capture_assessment)}</div></div>` : ''}
      ${car.contact_path_assessment ? `<div class="conv-card"><div class="conv-label">Contact Path</div><div class="conv-val">${esc(car.contact_path_assessment)}</div></div>` : ''}
    </div>
    <div class="conv-issues">
      ${car.conversion_friction_points?.length ? `<div class="conv-friction"><div class="conv-label">Friction Points</div><ul>${safeList(car.conversion_friction_points)}</ul></div>` : ''}
      ${car.trust_gaps?.length ? `<div class="conv-trust-gaps"><div class="conv-label">Trust Gaps</div><ul>${safeList(car.trust_gaps)}</ul></div>` : ''}
      ${car.cta_weaknesses?.length ? `<div class="conv-cta-weak"><div class="conv-label">CTA Weaknesses</div><ul>${safeList(car.cta_weaknesses)}</ul></div>` : ''}
      ${car.conversion_opportunities?.length ? `<div class="conv-opps"><div class="conv-label">Opportunities</div><ul>${safeList(car.conversion_opportunities)}</ul></div>` : ''}
    </div>
  </div>

  <!-- ── 9. SWOT ────────────────────────────── -->
  <div class="sec">
    ${secHeader(`9 · SWOT Analysis — ${safeName}`)}
    <div class="swot-grid">
      <div class="swot-cell swot-s">
        <div class="swot-label">Strengths</div>
        <ul>${safeList(swot.strengths)}</ul>
      </div>
      <div class="swot-cell swot-w">
        <div class="swot-label">Weaknesses</div>
        <ul>${safeList(swot.weaknesses)}</ul>
      </div>
      <div class="swot-cell swot-o">
        <div class="swot-label">Opportunities</div>
        <ul>${safeList(swot.opportunities)}</ul>
      </div>
      <div class="swot-cell swot-t">
        <div class="swot-label">Threats</div>
        <ul>${safeList(swot.threats)}</ul>
      </div>
    </div>
  </div>

  <!-- ── 10. Strategic Roadmap ──────────────── -->
  <div class="sec page-break">
    ${secHeader(`10 · Strategic Roadmap — ${safeName}`)}
    <div class="rm-grid">
      <div class="rm-col">
        <div class="rm-col-header rm-qw-h">Quick Wins <span class="rm-time-badge">0–7 days</span></div>
        <div class="rm-col-body">${roadmapCards(rm.quick_wins, '#16a34a')}</div>
      </div>
      <div class="rm-col">
        <div class="rm-col-header rm-gp-h">Growth Plays <span class="rm-time-badge">30 days</span></div>
        <div class="rm-col-body">${roadmapCards(rm.growth_plays, '#2563eb')}</div>
      </div>
      <div class="rm-col">
        <div class="rm-col-header rm-si-h">Strategic Investments <span class="rm-time-badge">60–90 days</span></div>
        <div class="rm-col-body">${roadmapCards(rm.strategic_investments, '#7c3aed')}</div>
      </div>
    </div>
  </div>

  <!-- ── 11. Growth Forecast ────────────────── -->
  <div class="sec">
    ${secHeader('11 · Growth Forecast')}
    <div class="gf-grid">
      ${gf.visibility_opportunities?.length ? `<div class="gf-card"><div class="gf-label">Visibility</div><ul>${safeList(gf.visibility_opportunities)}</ul></div>` : ''}
      ${gf.authority_opportunities?.length ? `<div class="gf-card"><div class="gf-label">Authority</div><ul>${safeList(gf.authority_opportunities)}</ul></div>` : ''}
      ${gf.conversion_opportunities?.length ? `<div class="gf-card"><div class="gf-label">Conversion</div><ul>${safeList(gf.conversion_opportunities)}</ul></div>` : ''}
      ${gf.audience_growth_opportunities?.length ? `<div class="gf-card"><div class="gf-label">Audience Growth</div><ul>${safeList(gf.audience_growth_opportunities)}</ul></div>` : ''}
    </div>
    ${gf.assumptions ? `<div class="gf-assumptions">Assumptions: ${esc(gf.assumptions)}</div>` : ''}
  </div>

  <!-- ── 12. Audit Confidence ───────────────── -->
  <div class="sec ac-sec">
    ${secHeader('12 · Audit Confidence &amp; Data Sources')}
    ${ac.data_quality ? `<div class="ac-quality">${esc(ac.data_quality)}</div>` : ''}
    <div class="ac-grid">
      ${ac.observed_findings?.length ? `<div class="ac-col ac-obs"><div class="ac-col-label">Observed</div><ul>${safeList(ac.observed_findings)}</ul></div>` : ''}
      ${ac.inferred_findings?.length ? `<div class="ac-col ac-inf"><div class="ac-col-label">Inferred</div><ul>${safeList(ac.inferred_findings)}</ul></div>` : ''}
      ${ac.estimated_findings?.length ? `<div class="ac-col ac-est"><div class="ac-col-label">Estimated</div><ul>${safeList(ac.estimated_findings)}</ul></div>` : ''}
    </div>
    ${ac.limitations ? `<div class="ac-limitations"><strong>Limitations:</strong> ${esc(ac.limitations)}</div>` : ''}
    <div class="ac-framework">
      <span class="ac-fw-item"><strong>Observed</strong> — confirmed from crawled website &amp; social data</span>
      <span class="ac-fw-item"><strong>Inferred</strong> — derived from available signals via AI analysis</span>
      <span class="ac-fw-item"><strong>Estimated</strong> — extrapolated from industry patterns</span>
    </div>
  </div>

  <!-- ── 13. Unlock Verified Intelligence ──── -->
  <div class="unlock-sec">
    <div class="sec-label">13 · Unlock Verified Brand Intelligence</div>
    ${uvi.current_limitations ? `<p class="unlock-intro">${esc(uvi.current_limitations)}</p>` : ''}
    ${uvi.value_proposition ? `<div class="unlock-vp">"${esc(uvi.value_proposition)}"</div>` : ''}
    ${uvi.what_becomes_available ? `<div class="unlock-grid">
      ${uvi.what_becomes_available.audience_analytics ? `<div class="unlock-item"><strong>Audience Analytics</strong><span>${esc(uvi.what_becomes_available.audience_analytics)}</span></div>` : ''}
      ${uvi.what_becomes_available.engagement_analytics ? `<div class="unlock-item"><strong>Engagement Analytics</strong><span>${esc(uvi.what_becomes_available.engagement_analytics)}</span></div>` : ''}
      ${uvi.what_becomes_available.content_analytics ? `<div class="unlock-item"><strong>Content Analytics</strong><span>${esc(uvi.what_becomes_available.content_analytics)}</span></div>` : ''}
      ${uvi.what_becomes_available.search_console ? `<div class="unlock-item"><strong>Search Console</strong><span>${esc(uvi.what_becomes_available.search_console)}</span></div>` : ''}
      ${uvi.what_becomes_available.growth_tracking ? `<div class="unlock-item"><strong>Growth Tracking</strong><span>${esc(uvi.what_becomes_available.growth_tracking)}</span></div>` : ''}
    </div>` : ''}
    <div class="unlock-cta">
      <strong>Get Started:</strong> Visit <span class="unlock-url">mypilotpost.com</span> and connect your social accounts to transform this audit into a live, verified brand intelligence dashboard for ${safeName}.
    </div>
  </div>

  <!-- ── Footer ─────────────────────────────── -->
  <div class="footer">
    <div class="footer-brand">myPilotPost · Brand Intelligence Platform</div>
    <div class="footer-note">Confidential · Generated ${date}</div>
  </div>

</div>
</body>
</html>`;
}

function safeFilename(name) {
  return (name || 'brand-audit').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase().slice(0, 60);
}

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
  const html = buildReportHTML(audit, report);

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
  const html = buildReportHTML(audit, report);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${safeFilename(audit.brand_name)}-brand-audit.html"`,
      'Cache-Control': 'no-store',
    },
  });
}

export const getAuditReportPDF = getAuditReport;
