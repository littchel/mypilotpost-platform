/**
 * myPilotPost — Intelligence Context Builder
 *
 * Reads real brand activity data from DB and compresses it into a
 * Groq-ready context string for the Brand Intelligence Engine.
 *
 * TOKEN TARGET: ≤ 2,500 input tokens
 */

function safeJSON(str, fallback = null) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function daysSince(dateStr) {
  if (!dateStr) return 999;
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export async function buildIntelligenceContext(db, brandId) {
  const [
    brand,
    latestAudit,
    deliveryStats,
    analyticsRows,
    connectedRows,
    blogStats,
    campaignStats,
  ] = await Promise.all([
    db.prepare(`
      SELECT name, industry, website_url, target_audience, archetype
      FROM brands WHERE id = ?
    `).bind(brandId).first(),

    db.prepare(`
      SELECT overall_score, full_report_json, created_at
      FROM brand_audit_results_v2
      WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(brandId).first(),

    db.prepare(`
      SELECT platform, status, COUNT(*) as count, MAX(created_at) as last_post
      FROM delivery_jobs
      WHERE brand_id = ? AND created_at > datetime('now', '-30 days')
      GROUP BY platform, status
    `).bind(brandId).all(),

    db.prepare(`
      SELECT platform,
             COUNT(*) as posts,
             SUM(impressions) as total_impressions,
             AVG(engagements) as avg_engagements,
             SUM(clicks) as total_clicks,
             AVG(ctr) as avg_ctr,
             MAX(impressions) as peak_impressions
      FROM content_analytics WHERE brand_id = ?
      GROUP BY platform
    `).bind(brandId).all(),

    db.prepare(`
      SELECT platform, status, expires_at
      FROM connected_accounts WHERE brand_id = ?
    `).bind(brandId).all(),

    db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'draft'     THEN 1 ELSE 0 END) as drafts,
        MAX(CASE WHEN status = 'published' THEN created_at END) as last_published
      FROM blog_posts WHERE brand_id = ?
    `).bind(brandId).first(),

    db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM campaigns WHERE brand_id = ?
    `).bind(brandId).first(),
  ]);

  // ── Parse audit report ────────────────────────────────────────────────────
  const auditReport = safeJSON(latestAudit?.full_report_json);
  const auditDims   = auditReport?.brand_score?.dimensions || {};
  const diagSnap    = auditReport?.diagnostic_snapshot    || {};
  const moatMap     = auditReport?.competitive_moat_map   || {};
  const convArch    = auditReport?.conversion_architecture_review || {};
  const contentDNA  = auditReport?.content_genome_analysis || {};

  // ── Process delivery stats ────────────────────────────────────────────────
  const platformActivity = {};
  for (const row of (deliveryStats.results || [])) {
    if (!platformActivity[row.platform]) {
      platformActivity[row.platform] = { published: 0, failed: 0, scheduled: 0, last_post: null };
    }
    const p = platformActivity[row.platform];
    if (row.status === 'published' || row.status === 'delivered') p.published += row.count;
    else if (row.status === 'failed')    p.failed    += row.count;
    else if (row.status === 'scheduled') p.scheduled += row.count;
    if (!p.last_post || row.last_post > p.last_post) p.last_post = row.last_post;
  }

  const allLastPosts = Object.values(platformActivity).map(p => p.last_post).filter(Boolean).sort();
  const lastPostDate = allLastPosts.at(-1) || null;
  const daysSincePost = daysSince(lastPostDate);
  const totalPublished = Object.values(platformActivity).reduce((s, p) => s + p.published, 0);

  // ── Platform connections ──────────────────────────────────────────────────
  const connected = (connectedRows.results || []).filter(a => a.status === 'active').map(a => a.platform);
  const expired   = (connectedRows.results || []).filter(a => {
    return a.status === 'expired' || (a.expires_at && new Date(a.expires_at) < new Date());
  }).map(a => a.platform);

  // ── Build compact context string ─────────────────────────────────────────
  const L = [];

  L.push(`=== BRAND PROFILE ===`);
  L.push(`Brand: ${brand?.name || 'Unknown'} | Industry: ${brand?.industry || 'Unknown'} | Website: ${brand?.website_url || 'none'}`);
  if (brand?.target_audience) L.push(`Audience: ${String(brand.target_audience).slice(0, 120)}`);
  if (brand?.archetype)       L.push(`Archetype: ${brand.archetype}`);

  L.push(`\n=== BRAND AUDIT SNAPSHOT ===`);
  if (latestAudit) {
    L.push(`Score: ${latestAudit.overall_score}/100 | Audited: ${(latestAudit.created_at || '').split('T')[0]}`);
    if (Object.keys(auditDims).length) {
      L.push(`Dimensions: web=${auditDims.web_presence||0} social=${auditDims.social_presence||0} content=${auditDims.content_strategy||0} consistency=${auditDims.brand_consistency||0} conversion=${auditDims.conversion_readiness||0}`);
    }
    const weaknesses = (diagSnap.strategic_weaknesses || []).slice(0, 3);
    if (weaknesses.length) L.push(`Top Weaknesses: ${weaknesses.join(' | ')}`);
    const opps = (diagSnap.growth_opportunities || []).slice(0, 2);
    if (opps.length) L.push(`Growth Opportunities: ${opps.join(' | ')}`);
    const whitespace = (moatMap.whitespace_opportunities || []).slice(0, 2);
    if (whitespace.length) L.push(`Competitive Whitespace: ${whitespace.join(' | ')}`);
    const contentMix = contentDNA.estimated_content_mix;
    if (contentMix) L.push(`Content Mix (estimated): edu=${contentMix.educational||0}% promo=${contentMix.promotional||0}% proof=${contentMix.social_proof||0}% community=${contentMix.community||0}% thought_lead=${contentMix.thought_leadership||0}%`);
    const friction = (convArch.conversion_friction_points || []).slice(0, 2);
    if (friction.length) L.push(`Conversion Friction: ${friction.join(' | ')}`);
  } else {
    L.push(`No audit data available.`);
  }

  L.push(`\n=== PUBLISHING ACTIVITY (30 DAYS) ===`);
  L.push(`Total Published: ${totalPublished} | Days Since Last Post: ${daysSincePost === 999 ? 'never' : daysSincePost}`);
  for (const [platform, stats] of Object.entries(platformActivity)) {
    L.push(`${platform}: published=${stats.published} failed=${stats.failed} scheduled=${stats.scheduled}`);
  }
  if (!Object.keys(platformActivity).length) L.push(`No publishing activity in the last 30 days.`);

  L.push(`\n=== CONTENT ANALYTICS ===`);
  const analytics = analyticsRows.results || [];
  if (analytics.length) {
    for (const row of analytics) {
      const eng = row.avg_engagements ? Number(row.avg_engagements).toFixed(1) : '0';
      const ctr = row.avg_ctr ? (Number(row.avg_ctr) * 100).toFixed(2) + '%' : '0%';
      L.push(`${row.platform}: posts=${row.posts} impressions=${row.total_impressions||0} avg_eng=${eng} clicks=${row.total_clicks||0} avg_ctr=${ctr} peak=${row.peak_impressions||0}`);
    }
  } else {
    L.push(`No content analytics data yet.`);
  }

  L.push(`\n=== PLATFORM CONNECTIONS ===`);
  L.push(`Connected: ${connected.join(', ') || 'none'} | Expired/Broken: ${expired.join(', ') || 'none'}`);
  L.push(`Total Integrations: ${(connectedRows.results || []).length}`);

  L.push(`\n=== CONTENT LIBRARY ===`);
  L.push(`Blog Posts: published=${blogStats?.published||0} drafts=${blogStats?.drafts||0} last_published=${(blogStats?.last_published||'').split('T')[0] || 'never'}`);
  L.push(`Campaigns: total=${campaignStats?.total||0} active=${campaignStats?.active||0}`);

  const context = L.join('\n');
  const tokens  = Math.ceil(context.length / 4);
  console.log(`[INTEL_CONTEXT_SIZE] ~${tokens}tok for brand=${brandId}`);

  return { context, tokens };
}
