/**
 * myPilotPost — SEO Audit HTML Renderer
 * File: packages/api/src/core/reports/seo/html.js
 *
 * Purpose:
 * - Convert SEO audit JSON → printable HTML
 * - White-label safe (client logo replaces myPilotPost)
 * - Optimized for Cloudflare Workers PDF rendering
 */

export function renderSeoAuditHTML(report) {
  const {
    meta,
    executive_summary,
    technical_audit,
    content_optimization,
    on_page_elements,
    keyword_optimization,
    action_plan,
    benchmarks
  } = report;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SEO Audit Report — ${meta.client_name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial;
      color: #1f2937;
      margin: 0;
      padding: 40px;
      background: #ffffff;
    }
    h1, h2, h3 {
      margin-bottom: 8px;
      color: #111827;
    }
    h1 { font-size: 32px; }
    h2 { font-size: 22px; margin-top: 32px; }
    h3 { font-size: 16px; margin-top: 20px; }
    p, li {
      font-size: 14px;
      line-height: 1.6;
    }
    .cover {
      text-align: center;
      margin-bottom: 60px;
    }
    .score {
      font-size: 48px;
      font-weight: bold;
      margin: 20px 0;
      color: ${
        meta.score_label === "good" ? "#16a34a" :
        meta.score_label === "warning" ? "#f59e0b" :
        "#dc2626"
      };
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      background: #e5e7eb;
    }
    .section {
      margin-bottom: 48px;
      page-break-inside: avoid;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
    ul {
      padding-left: 18px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    .table th,
    .table td {
      border: 1px solid #e5e7eb;
      padding: 8px;
      font-size: 13px;
      text-align: left;
    }
    .table th {
      background: #f9fafb;
    }
    .muted {
      color: #6b7280;
      font-size: 13px;
    }
    .action-block {
      margin-bottom: 16px;
      padding: 12px;
      border-left: 4px solid #2563eb;
      background: #f8fafc;
    }
    .footer {
      margin-top: 80px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>

<body>

  <!-- COVER PAGE -->
  <div class="cover section">
    ${meta.client_logo_url ? `<img src="${meta.client_logo_url}" height="60" />` : ""}
    <h1>SEO Audit Report</h1>
    <p class="muted">${meta.client_name}</p>
    <p class="muted">Generated: ${new Date(meta.generated_at).toDateString()}</p>
    <div class="score">${meta.overall_score}</div>
    <span class="badge">Overall SEO Health</span>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="section">
    <h2>Executive Summary</h2>
    <p><strong>Key Highlight:</strong> ${executive_summary.key_highlight}</p>

    <div class="grid">
      <div>
        <h3>Top Wins</h3>
        <ul>
          ${executive_summary.top_wins.map(w => `<li>${w}</li>`).join("")}
        </ul>
      </div>
      <div>
        <h3>Top Fixes</h3>
        <ul>
          ${executive_summary.top_fixes.map(f => `<li>${f}</li>`).join("")}
        </ul>
      </div>
    </div>

    <p><strong>Estimated Impact:</strong> ${executive_summary.estimated_impact}</p>
  </div>

  <!-- TECHNICAL AUDIT -->
  <div class="section">
    <h2>Technical Foundation Audit</h2>

    <h3>URL Structure</h3>
    <p>Keyword in URL: ${technical_audit.url_structure.checks.keyword_in_url ? "Yes" : "No"}</p>
    <p>HTTPS Enabled: ${technical_audit.url_structure.checks.https_enabled ? "Yes" : "No"}</p>

    <h3>Page Speed & Core Web Vitals</h3>
    <table class="table">
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Mobile Score</td>
        <td>${technical_audit.page_speed.mobile_score}</td>
      </tr>
      <tr>
        <td>Desktop Score</td>
        <td>${technical_audit.page_speed.desktop_score}</td>
      </tr>
      <tr>
        <td>LCP</td>
        <td>${technical_audit.page_speed.core_web_vitals.lcp}</td>
      </tr>
      <tr>
        <td>FID</td>
        <td>${technical_audit.page_speed.core_web_vitals.fid}</td>
      </tr>
      <tr>
        <td>CLS</td>
        <td>${technical_audit.page_speed.core_web_vitals.cls}</td>
      </tr>
    </table>
  </div>

  <!-- CONTENT OPTIMIZATION -->
  <div class="section">
    <h2>Content Optimization Audit</h2>
    <p><strong>Title Tags:</strong> ${content_optimization.title_tags.notes}</p>
    <p><strong>Meta Descriptions:</strong> ${content_optimization.meta_descriptions.notes}</p>
    <p><strong>Content Depth:</strong> ${content_optimization.content_quality.word_count}</p>
    <p><strong>Internal Linking:</strong> ${content_optimization.internal_links.count}</p>
  </div>

  <!-- KEYWORD ANALYSIS -->
  <div class="section">
    <h2>Keyword & Topic Optimization</h2>
    <p><strong>Primary Keyword:</strong> ${keyword_optimization.primary_keyword.keyword}</p>
    <p><strong>Intent:</strong> ${keyword_optimization.primary_keyword.intent_match}</p>

    <h3>Secondary Keywords</h3>
    <ul>
      ${keyword_optimization.secondary_keywords
        .map(k => `<li>${k.term} — ${k.strength}</li>`)
        .join("")}
    </ul>
  </div>

  <!-- ACTION PLAN -->
  <div class="section">
    <h2>Priority Action Plan</h2>

    ${action_plan.critical.map(i => `
      <div class="action-block">
        <strong>CRITICAL:</strong> ${i.issue}<br/>
        Impact: ${i.impact} • Time: ${i.time}<br/>
        Fix: ${i.fix}
      </div>
    `).join("")}

    ${action_plan.high.map(i => `
      <div class="action-block">
        <strong>HIGH:</strong> ${i.issue}<br/>
        Impact: ${i.impact} • Time: ${i.time}<br/>
        Fix: ${i.fix}
      </div>
    `).join("")}
  </div>

  <!-- BENCHMARKS -->
  <div class="section">
    <h2>Measurement & Tracking</h2>
    <p><strong>Organic Traffic:</strong> ${benchmarks.pre_audit.organic_traffic}</p>
    <p><strong>Tracking Plan:</strong> ${benchmarks.tracking_plan.review_cycle}</p>
  </div>

  <div class="footer">
    Confidential SEO Audit • Generated by your agency
  </div>

</body>
</html>
`;
}
