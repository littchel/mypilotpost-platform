/**
 * myPilotPost — Report Renderer
 * LAYER 1: Story mapper — transforms report JSON into structured story_json.
 * Orchestrates templates + components into a complete HTML document.
 * No AI. No PDF libraries. No React.
 */

import { getTheme } from './themes.js';
import { buildTemplateCss, getTemplateConfig } from './templates.js';
import { buildContents, renderTOC } from './toc.js';
import {
  renderCover,
  renderSection,
  renderScoreHero,
  renderRoadmap,
  renderCTA,
  renderBackpage,
  renderBusinessProfile,
  renderDiagnosticSnapshot,
  renderSocialPresence,
  renderBrandIdentity,
  renderContentGenome,
  renderAudienceResonance,
  renderCompetitiveMoat,
  renderConversionArchitecture,
  renderSWOT,
  renderGrowthForecast,
  renderAuditConfidence,
  SC,
  SL,
  esc,
} from './components.js';

// ── Section definitions ──────────────────────────────────────────────────────

const SECTIONS_META = [
  { number: 1,  key: 'business_profile',            title: 'Business Profile',              breakBefore: false },
  { number: 2,  key: 'diagnostic_snapshot',         title: 'Diagnostic Snapshot',           breakBefore: false },
  { number: 3,  key: 'social_presence_review',      title: 'Social Presence Review',        breakBefore: false },
  { number: 4,  key: 'brand_identity_review',       title: 'Brand Identity Review',         breakBefore: false },
  { number: 5,  key: 'content_genome_analysis',     title: 'Content Genome Analysis',       breakBefore: false },
  { number: 6,  key: 'audience_resonance_review',   title: 'Audience Resonance Review',     breakBefore: false },
  { number: 7,  key: 'competitive_moat_map',        title: 'Competitive Moat Map',          breakBefore: true  },
  { number: 8,  key: 'conversion_architecture_review', title: 'Conversion Architecture',    breakBefore: false },
  { number: 9,  key: 'swot',                        title: 'SWOT Analysis',                 breakBefore: false },
  { number: 10, key: 'strategic_roadmap',           title: 'Strategic Roadmap',             breakBefore: true  },
  { number: 11, key: 'growth_forecast',             title: 'Growth Forecast',               breakBefore: false },
  { number: 12, key: 'audit_confidence',            title: 'Audit Confidence & Data Sources', breakBefore: false },
  { number: 13, key: 'unlock_verified_intelligence', title: 'Unlock Verified Intelligence', breakBefore: false },
];

// ── LAYER 1 — Story Mapper ───────────────────────────────────────────────────

export function mapToStory(audit, report, options = {}) {
  const score = audit.overall_score || report?.brand_score?.overall || 0;
  const scoreColor = SC(score);
  const scoreLabel = SL(score);
  const date = new Date(audit.created_at || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const cover = {
    reportTitle: 'Social Media Brand Audit',
    brandName: audit.brand_name || 'Your Brand',
    industry: audit.industry || report?.business_profile?.industry || '',
    niche: report?.business_profile?.niche || '',
    websiteUrl: audit.website_url || '',
    score,
    scoreColor,
    scoreLabel,
    scoreRationale: report?.brand_score?.rationale || '',
    dimensions: report?.brand_score?.dimensions || {},
    date,
    reportId: String(audit.id || '').slice(0, 8).toUpperCase(),
  };

  const sections = SECTIONS_META
    .filter(meta => report?.[meta.key])
    .map(meta => ({ ...meta, data: report[meta.key] }));

  const contentsItems = buildContents(sections);

  const backpage = {
    brandName: audit.brand_name || 'Your Brand',
    date,
    reportId: String(audit.id || '').slice(0, 8).toUpperCase(),
    nextActions: [
      'Connect your social accounts for live data tracking',
      'Schedule a monthly brand audit review',
      'Explore AI Content Studio for strategic content creation',
    ],
  };

  const meta = {
    generatedAt: new Date().toISOString(),
    reportId: audit.id,
    template: options.template || 'executive',
    whiteLabelEnabled: options.whiteLabelEnabled || false,
  };

  return { cover, contentsItems, sections, backpage, meta };
}

// ── Branding resolver ────────────────────────────────────────────────────────

function resolveBranding(options = {}) {
  const wl = options.whiteLabelEnabled || false;
  return {
    showMypilotpost: !wl,
    clientName: options.clientName || '',
    clientUrl: options.clientUrl || '',
    clientAccent: options.clientAccent || '',
  };
}

// ── Section body dispatcher ──────────────────────────────────────────────────

function renderSectionBody(section, branding) {
  const d = section.data;
  switch (section.key) {
    case 'unlock_verified_intelligence':
      return renderCTA(d, branding);
    case 'strategic_roadmap':
      return renderRoadmap(d);
    case 'business_profile':
      return renderBusinessProfile(d);
    case 'diagnostic_snapshot':
      return renderDiagnosticSnapshot(d);
    case 'social_presence_review':
      return renderSocialPresence(d);
    case 'brand_identity_review':
      return renderBrandIdentity(d);
    case 'content_genome_analysis':
      return renderContentGenome(d);
    case 'audience_resonance_review':
      return renderAudienceResonance(d);
    case 'competitive_moat_map':
      return renderCompetitiveMoat(d);
    case 'conversion_architecture_review':
      return renderConversionArchitecture(d);
    case 'swot':
      return renderSWOT(d);
    case 'growth_forecast':
      return renderGrowthForecast(d);
    case 'audit_confidence':
      return renderAuditConfidence(d);
    default:
      return `<p class="na-text">Section data unavailable.</p>`;
  }
}

// ── Document assembler ───────────────────────────────────────────────────────

function assembleDocument(story, theme, branding, css) {
  const { cover, contentsItems, sections, backpage, meta } = story;
  const safeName = esc(cover.brandName);

  const coverHtml = renderCover(cover, branding);
  const tocHtml = renderTOC(contentsItems);

  // Score summary opens the body before numbered sections
  const scoreSectionHtml = cover.score > 0
    ? `<div class="report-section score-summary-section" id="score">
  <div class="section-header">
    <div class="section-watermark" aria-hidden="true">${cover.score}</div>
    <div class="section-meta">
      <span class="section-num-pill" style="background:${cover.scoreColor}1a;color:${cover.scoreColor}">${esc(cover.scoreLabel)}</span>
      <h2 class="section-title-text">Brand Score</h2>
    </div>
    <div class="section-rule" style="background:linear-gradient(to right,${cover.scoreColor},transparent)"></div>
  </div>
  <div class="section-body">
    ${renderScoreHero({ score: cover.score, dimensions: cover.dimensions, rationale: cover.scoreRationale, label: cover.scoreLabel })}
  </div>
</div>`
    : '';

  // Render all sections
  const sectionsHtml = sections.map(section => {
    const isCTA = section.key === 'unlock_verified_intelligence';
    const html = renderSectionBody(section, branding);

    if (isCTA) {
      // CTA section has its own dark background — wrap differently
      return `<div class="report-section cta-section-wrap" id="s${section.number}">
        <div class="section-header" style="padding:36px 48px 0">
          <div class="section-watermark" style="color:rgba(255,255,255,0.04)" aria-hidden="true">${String(section.number).padStart(2, '0')}</div>
          <div class="section-meta">
            <span class="section-num-pill" style="background:rgba(255,255,255,0.15)">${String(section.number).padStart(2, '0')}</span>
            <h2 class="section-title-text" style="color:#fff">${esc(section.title)}</h2>
          </div>
          <div class="section-rule" style="opacity:0.2"></div>
        </div>
        <div class="section-body">${html}</div>
      </div>`;
    }

    return renderSection({
      number: section.number,
      title: section.title,
      pageBreakBefore: section.breakBefore,
      html,
    });
  }).join('\n');

  const backpageHtml = renderBackpage(backpage, branding);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="myPilotPost Brand Intelligence Platform">
<title>Brand Audit Report &mdash; ${safeName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>${css}</style>
<script>if(new URLSearchParams(location.search).get('print')==='1'){window.addEventListener('load',function(){setTimeout(function(){window.print()},800)})}</script>
</head>
<body>
<div class="report-page">

${coverHtml}

${tocHtml}

<div class="report-body">
${scoreSectionHtml}
${sectionsHtml}
</div>

${backpageHtml}

</div>
</body>
</html>`;
}

// ── Main export ──────────────────────────────────────────────────────────────

export function renderReport(audit, report, options = {}) {
  const templateName = options.template || 'executive';
  const theme = getTheme(templateName);
  const branding = resolveBranding(options);

  const story = mapToStory(audit, report, options);
  const css = buildTemplateCss(theme);

  return assembleDocument(story, theme, branding, css);
}

export function safeFilename(name) {
  return (name || 'brand-audit').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase().slice(0, 60);
}
