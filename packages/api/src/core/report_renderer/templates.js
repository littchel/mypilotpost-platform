/**
 * myPilotPost — Template System
 * Generates the CSS for each report template.
 * Only styling — no business logic.
 */

// ── Print CSS (mirrors print.css — inlined for self-contained HTML) ──────────

export const PRINT_CSS = `
@page{size:A4;margin:0}
@media print{
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
body{background:#fff!important;margin:0;padding:0}
.report-page{box-shadow:none!important;max-width:100%!important}
.report-cover{page-break-before:avoid;page-break-after:always;break-after:page;min-height:100vh}
.report-contents{page-break-before:always;break-before:page;page-break-after:always;break-after:page}
.section-break-before{page-break-before:always;break-before:page}
.report-backpage{page-break-before:always;break-before:page;min-height:100vh}
.r-card,.swot-cell,.roadmap-col,.r-grid-2,.r-grid-3,.r-grid-4,.score-hero,.dim-bars-group,.cta-grid,.platform-cards-grid,.break-avoid{break-inside:avoid;page-break-inside:avoid}
p{widows:3;orphans:3}
.section-header{break-after:avoid;page-break-after:avoid}
.report-section{padding-left:40px!important;padding-right:40px!important}
a{text-decoration:none!important}
}`;

// ── Base CSS (layout + components — shared across templates) ─────────────────

const BASE_CSS = `
/* ── Reset ── */
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f4f8;color:var(--text-main);-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:13px;-webkit-font-smoothing:antialiased}
a{color:var(--pilot-blue);text-decoration:none}
a:hover{text-decoration:underline}

/* ── Page wrapper ── */
.report-page{max-width:900px;margin:0 auto;background:var(--surface-primary);box-shadow:0 4px 80px rgba(0,0,0,.14)}

/* ════ COVER ════════════════════════════════════════════════════════════════ */
.report-cover{background:var(--cover-bg);color:var(--cover-text);min-height:100vh;display:flex;flex-direction:column;position:relative;overflow:hidden}

.cover-top-bar{display:flex;align-items:center;justify-content:space-between;padding:28px 48px 24px;border-bottom:1px solid var(--cover-divider)}
.cover-logo-mark{font-size:20px;font-weight:900;letter-spacing:-.5px}
.cover-logo-mark span{color:var(--cover-accent)}
.cover-type-badge{background:var(--cover-badge-bg);border:1px solid var(--cover-badge-border);color:var(--cover-badge-text);padding:5px 14px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em}

.cover-hero{flex:1;display:flex;align-items:center;gap:48px;padding:48px 48px 32px}
.cover-score-col{display:flex;flex-direction:column;align-items:center;gap:12px;flex-shrink:0}
.cover-donut-wrap{filter:drop-shadow(0 8px 24px rgba(0,0,0,.3))}
.cover-score-pill{padding:5px 16px;border-radius:100px;border:1px solid;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.cover-info-col{flex:1}
.cover-report-eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--cover-text-muted);margin-bottom:12px}
.cover-brand-name{font-size:38px;font-weight:900;letter-spacing:-.02em;line-height:1.1;margin-bottom:8px}
.cover-industry{font-size:15px;color:var(--cover-text-muted);margin-bottom:6px;font-weight:500}
.cover-website{font-size:12px;color:var(--cover-text-subtle);font-family:monospace}

.cover-dims-strip{padding:24px 48px;border-top:1px solid var(--cover-divider)}
.cover-dims-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--cover-text-muted);margin-bottom:12px}
.cover-dims-bars{display:flex;flex-direction:column;gap:10px}
.cover-dim-row{display:flex;align-items:center;gap:12px}
.cover-dim-label{font-size:11px;font-weight:600;color:var(--cover-text-muted);width:160px;flex-shrink:0}
.cover-dim-val{font-size:11px;font-weight:800;width:28px;text-align:right;flex-shrink:0}

.cover-footer-bar{display:flex;align-items:center;justify-content:space-between;padding:18px 48px;border-top:1px solid var(--cover-divider)}
.cover-footer-left{display:flex;align-items:center;gap:10px}
.cover-footer-logo{font-size:13px;font-weight:800;color:var(--cover-text)}
.cover-footer-attribution{font-size:11px;color:var(--cover-text-muted)}
.cover-footer-right{display:flex;align-items:center;gap:10px}
.cover-footer-date,.cover-footer-id{font-size:11px;color:var(--cover-text-subtle)}

/* ════ CONTENTS ════════════════════════════════════════════════════════════ */
.report-contents{background:var(--surface-primary);min-height:60vh;display:flex;flex-direction:column}
.contents-inner{flex:1;padding:56px 56px 40px;display:flex;flex-direction:column}
.contents-eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--section-accent);margin-bottom:10px}
.contents-heading{font-size:32px;font-weight:900;color:var(--text-main);letter-spacing:-.02em;margin-bottom:24px}
.contents-rule{height:2px;background:linear-gradient(to right,var(--section-accent),var(--border-subtle));border-radius:1px;margin-bottom:32px}

.toc-list{display:flex;flex-direction:column;gap:4px;flex:1}
.toc-row{display:flex;align-items:baseline;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);color:var(--text-main);text-decoration:none;transition:color .15s}
.toc-row:hover{color:var(--section-accent)}
.toc-row:last-child{border-bottom:none}
.toc-num{font-size:11px;font-weight:800;color:var(--section-accent);width:24px;flex-shrink:0;font-variant-numeric:tabular-nums}
.toc-title{font-size:13px;font-weight:600;color:inherit;flex:1}
.toc-leader{flex:1;border-bottom:1px dotted var(--border-subtle);margin:0 8px 3px}
.toc-ref{font-size:11px;color:var(--text-muted);font-weight:500;flex-shrink:0}

.contents-footer-bar{margin-top:auto;padding-top:24px;border-top:1px solid var(--border-subtle)}
.contents-brand-credit{font-size:11px;color:var(--text-muted)}

/* ════ SECTIONS ════════════════════════════════════════════════════════════ */
.report-section{padding:40px 48px;border-bottom:1px solid var(--border-subtle);background:var(--surface-primary);position:relative}
.report-section:last-of-type{border-bottom:none}

.section-header{position:relative;margin-bottom:24px;overflow:hidden}
.section-watermark{position:absolute;right:0;top:-28px;font-size:120px;font-weight:900;color:var(--section-watermark);line-height:1;pointer-events:none;user-select:none;letter-spacing:-.04em}
.section-meta{position:relative;display:flex;align-items:center;gap:12px}
.section-num-pill{font-size:10px;font-weight:800;background:var(--section-accent);color:#fff;padding:3px 10px;border-radius:100px;flex-shrink:0;letter-spacing:.04em}
.section-title-text{font-size:20px;font-weight:900;color:var(--text-main);letter-spacing:-.02em;line-height:1.2}
.section-rule{height:1px;background:linear-gradient(to right,var(--section-accent),transparent);margin-top:12px;opacity:.4}

.section-body{position:relative}

/* ════ SCORE HERO ══════════════════════════════════════════════════════════ */
.score-hero{display:flex;gap:40px;align-items:flex-start;padding:8px 0}
.score-donut-col{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:10px}
.score-label-pill{padding:4px 14px;border-radius:100px;border:1px solid;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
.score-detail-col{flex:1}
.score-rationale{font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:18px}
.dim-bars-group{display:flex;flex-direction:column;gap:10px}
.dim-row{display:flex;align-items:center;gap:12px}
.dim-label{font-size:11px;font-weight:600;color:var(--text-secondary);width:180px;flex-shrink:0}
.dim-bar-wrap{flex:1}
.dim-val{font-size:12px;font-weight:800;width:28px;text-align:right;flex-shrink:0}

/* ════ CARDS ════════════════════════════════════════════════════════════════ */
.r-card{padding:14px 16px;border-radius:var(--radius-lg);border:1px solid;background:var(--surface-secondary)}
.r-card-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
.r-card-val{font-size:12px;color:var(--text-secondary);line-height:1.6}
.r-card-list{list-style:none;padding:0}
.r-card-list li{font-size:11px;color:var(--text-secondary);line-height:1.55;padding:4px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.r-card-list li:last-child{border-bottom:none}

.r-card--plain{background:var(--surface-secondary);border-color:var(--border-subtle)}
.r-card--plain .r-card-label{color:var(--text-muted)}

.r-card--green{background:#f0fdf4;border-color:#bbf7d0}
.r-card--green .r-card-label{color:#16a34a}
.r-card--green .r-card-list li,.r-card--green .r-card-val{color:#374151}

.r-card--amber{background:#fff7ed;border-color:#fed7aa}
.r-card--amber .r-card-label{color:#d97706}
.r-card--amber .r-card-list li,.r-card--amber .r-card-val{color:#374151}

.r-card--red{background:#fef2f2;border-color:#fecaca}
.r-card--red .r-card-label{color:#dc2626}
.r-card--red .r-card-list li,.r-card--red .r-card-val{color:#374151}

.r-card--blue{background:#eff6ff;border-color:#bfdbfe}
.r-card--blue .r-card-label{color:#2563eb}
.r-card--blue .r-card-list li,.r-card--blue .r-card-val{color:#374151}

.r-card--purple{background:#f5f3ff;border-color:#ddd6fe}
.r-card--purple .r-card-label{color:#7c3aed}
.r-card--purple .r-card-list li,.r-card--purple .r-card-val{color:#374151}

/* ════ GRIDS ════════════════════════════════════════════════════════════════ */
.r-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.r-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.r-grid-4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}

/* ════ CALLOUTS ═════════════════════════════════════════════════════════════ */
.callout-box{font-size:12px;line-height:1.7;padding:12px 16px;border-radius:var(--radius-md);border:1px solid}
.callout-surface{background:var(--surface-secondary);border-color:var(--border-subtle);color:var(--text-secondary)}
.callout-blue{background:#eff6ff;border-color:#bfdbfe;border-left:3px solid #2563eb;color:#1e3a5f}
.callout-slate{background:#f8fafc;border-color:#e2e8f0;border-left:3px solid #94a3b8;color:#475569;font-style:italic}
.callout-amber{background:#fff7ed;border-color:#fed7aa;border-left:3px solid #f59e0b;color:#7c2d12}
.summary-box{font-size:13px;font-weight:500}

/* ════ KV GRID ══════════════════════════════════════════════════════════════ */
.kv-grid.r-grid-2{gap:0;border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden}
.kv-col{border-right:1px solid var(--border-subtle)}
.kv-col:last-child{border-right:none}
.kv-row{display:flex;border-bottom:1px solid #f1f5f9}
.kv-row:last-child{border-bottom:none}
.kv-key{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);padding:10px 14px;background:#fafbfc;width:140px;flex-shrink:0;border-right:1px solid #f1f5f9;display:flex;align-items:center}
.kv-val{font-size:12px;color:var(--text-secondary);padding:10px 14px;line-height:1.5;flex:1;text-transform:capitalize}

/* ════ PLATFORM CARDS ═══════════════════════════════════════════════════════ */
.platform-cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:14px}
.plat-card{padding:12px 14px;border-radius:var(--radius-md);border:1px solid var(--border-subtle);background:var(--surface-secondary)}
.plat-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.plat-name{font-size:12px;font-weight:700;color:var(--text-main);text-transform:capitalize}
.plat-badge{font-size:10px;font-weight:700;text-transform:capitalize;padding:2px 9px;border-radius:100px;border:1px solid}
.plat-url{font-size:10px;color:var(--pilot-blue);word-break:break-all}
.plat-card-notes{font-size:10px;color:var(--text-muted);line-height:1.5;margin-top:4px}

/* ════ CONTENT MIX ══════════════════════════════════════════════════════════ */
.mix-chart-wrap{margin:12px 0}
.mix-legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.mix-leg-item{display:flex;align-items:center;gap:6px;font-size:11px}
.mix-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0}
.mix-lbl{color:var(--text-secondary)}
.mix-pct{font-weight:700;color:var(--text-main)}

/* ════ THEME PILLS ══════════════════════════════════════════════════════════ */
.theme-pills{display:flex;flex-wrap:wrap;gap:6px}
.theme-pill{padding:4px 11px;border-radius:100px;font-size:11px;font-weight:600}
.tp-green{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
.tp-amber{background:#fff7ed;color:#b45309;border:1px solid #fde68a}
.tp-red{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}

/* ════ ROADMAP ══════════════════════════════════════════════════════════════ */
.roadmap-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.roadmap-col{border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border-subtle)}
.roadmap-col-hdr{padding:11px 14px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;justify-content:space-between}
.rm-hdr-green{background:#f0fdf4;color:#16a34a}
.rm-hdr-blue{background:#eff6ff;color:#2563eb}
.rm-hdr-purple{background:#f5f3ff;color:#7c3aed}
.rm-time-badge{font-size:9px;font-weight:600;color:#94a3b8;text-transform:none}
.roadmap-col-body{background:var(--surface-primary)}
.rm-card{padding:12px 14px;border-bottom:1px solid #f1f5f9;border-left:3px solid transparent}
.rm-card:last-child{border-bottom:none}
.rm-action{font-size:12px;font-weight:700;color:var(--text-main);margin-bottom:4px;line-height:1.45}
.rm-impact{font-size:11px;color:var(--text-muted);line-height:1.5;margin-bottom:3px}
.rm-outcome{font-size:11px;color:#16a34a;font-weight:600;margin-bottom:3px}
.rm-timeframe{font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.04em}

/* ════ SWOT ═════════════════════════════════════════════════════════════════ */
.swot-label{font-size:12px!important}

/* ════ CTA SECTION ══════════════════════════════════════════════════════════ */
.cta-section-wrap{background:linear-gradient(160deg,#0a1628 0%,#0f172a 100%);color:#fff;margin-top:0}
.cta-inner{padding:36px 48px}
.cta-intro{font-size:13px;color:rgba(255,255,255,.75);line-height:1.7;margin-bottom:18px}
.cta-vp{font-size:14px;color:#93c5fd;font-weight:700;font-style:italic;line-height:1.55;margin-bottom:20px;border:none}
.cta-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;margin-bottom:20px}
.cta-item{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:var(--radius-lg);padding:14px}
.cta-item-title{display:block;font-size:12px;font-weight:700;color:#fff;margin-bottom:4px}
.cta-item-desc{display:block;font-size:11px;color:rgba(255,255,255,.65);line-height:1.55}
.cta-action-box{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:var(--radius-md);padding:14px 18px;font-size:13px;color:rgba(255,255,255,.9);line-height:1.6}
.cta-url{color:#60a5fa;font-weight:700}

/* ════ AUDIT CONFIDENCE ═════════════════════════════════════════════════════ */
.ac-legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.ac-leg-item{font-size:11px;color:var(--text-muted);padding:5px 10px;background:var(--surface-secondary);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}

/* ════ UTILITIES ════════════════════════════════════════════════════════════ */
.eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted)}
.eyebrow-note{font-size:11px;color:var(--text-muted);font-style:italic;margin-bottom:10px}
.body-text{font-size:13px;color:var(--text-secondary);line-height:1.7}
.inline-list{columns:2;gap:20px}
.na-text{font-size:12px;color:var(--text-muted);font-style:italic}
.na-item{color:var(--text-muted);font-style:italic}
.chart-wrap{margin:12px 0}
.chart-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:8px}

/* ════ BACK PAGE ════════════════════════════════════════════════════════════ */
.report-backpage{background:var(--backpage-bg);color:var(--backpage-text);min-height:100vh;display:flex;flex-direction:column}
.bp-inner{flex:1;display:flex;flex-direction:column;padding:52px 56px 36px}
.bp-top{margin-bottom:36px}
.bp-logo-mark{font-size:28px;font-weight:900;letter-spacing:-.02em;margin-bottom:8px}
.bp-logo-accent{color:var(--backpage-accent)}
.bp-tagline{font-size:13px;color:var(--backpage-text-muted);font-weight:500;margin-bottom:28px}
.bp-divider{height:1px;background:var(--backpage-divider);margin-top:28px}

.bp-content{display:grid;grid-template-columns:1fr auto;gap:48px;flex:1;align-items:start;margin-top:40px}
.bp-thank-you{font-size:22px;font-weight:800;color:var(--backpage-text);margin-bottom:24px;letter-spacing:-.01em}
.bp-thank-you strong{color:var(--backpage-accent)}
.bp-next-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--backpage-text-muted);margin-bottom:14px}
.bp-steps{display:flex;flex-direction:column;gap:12px}
.bp-step{display:flex;align-items:flex-start;gap:12px}
.bp-step-dot{width:8px;height:8px;border-radius:50%;background:var(--backpage-accent);flex-shrink:0;margin-top:4px}
.bp-step-text{font-size:13px;color:rgba(255,255,255,.8);line-height:1.6}

.bp-right{display:flex;flex-direction:column;align-items:center;gap:10px}
.bp-qr-wrap{background:white;padding:10px;border-radius:var(--radius-lg);box-shadow:0 4px 20px rgba(0,0,0,.3)}
.bp-qr-caption{font-size:10px;color:var(--backpage-text-muted);text-align:center;line-height:1.5;margin-top:4px}

.bp-footer{border-top:1px solid var(--backpage-divider);padding-top:20px;margin-top:auto}
.bp-footer-url{font-size:16px;font-weight:700;color:var(--backpage-text);margin-bottom:12px}
.bp-footer-rule{height:1px;background:var(--backpage-divider);margin-bottom:12px}
.bp-footer-meta{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--backpage-text-muted)}
.bp-footer-dot{color:var(--backpage-divider)}
`;

// ── Template configs ─────────────────────────────────────────────────────────

export const TEMPLATE_CONFIGS = {
  executive: { pageBreakSections: [7, 10] },
  agency:    { pageBreakSections: [7, 10] },
  white_label: { pageBreakSections: [7, 10] },
  internal:  { pageBreakSections: [] },
};

// ── buildTemplateCss ─────────────────────────────────────────────────────────

export function buildTemplateCss(theme) {
  const vars = `:root{
  --pilot-blue:#2563eb;
  --pilot-blue-light:#dbeafe;
  --pilot-blue-dark:#1d4ed8;
  --purple:#7c3aed;
  --text-main:#0f172a;
  --text-secondary:#334155;
  --text-muted:#64748b;
  --border-subtle:#e5e7eb;
  --surface-primary:#ffffff;
  --surface-secondary:#f8fafc;
  --radius-md:6px;
  --radius-lg:10px;
  --score-strong:#16a34a;
  --score-developing:#d97706;
  --score-weak:#dc2626;
  /* Cover theme vars */
  --cover-bg:${theme.cover.bg};
  --cover-accent:${theme.cover.accent};
  --cover-text:${theme.cover.text};
  --cover-text-muted:${theme.cover.textMuted};
  --cover-text-subtle:${theme.cover.textSubtle};
  --cover-divider:${theme.cover.divider};
  --cover-badge-bg:${theme.cover.badgeBg};
  --cover-badge-border:${theme.cover.badgeBorder};
  --cover-badge-text:${theme.cover.badgeText};
  /* Section theme vars */
  --section-accent:${theme.section.accentBorder};
  --section-watermark:${theme.section.watermarkColor};
  --section-header-bg:${theme.section.headerBg};
  /* Backpage theme vars */
  --backpage-bg:${theme.backpage.bg};
  --backpage-accent:${theme.backpage.accent};
  --backpage-text:${theme.backpage.text};
  --backpage-text-muted:${theme.backpage.textMuted};
  --backpage-divider:${theme.backpage.divider};
}`;

  return vars + BASE_CSS + PRINT_CSS;
}

export function getTemplateConfig(name = 'executive') {
  return TEMPLATE_CONFIGS[name] || TEMPLATE_CONFIGS.executive;
}
