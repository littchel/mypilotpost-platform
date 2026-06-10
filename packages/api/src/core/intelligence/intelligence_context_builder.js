/**
 * myPilotPost — Intelligence Context Builder
 *
 * Reads real brand activity data from DB and compresses it into a
 * Groq-ready context string for the Brand Intelligence Engine.
 *
 * TOKEN TARGET: ≤ 2,500 input tokens
 *
 * Column audit (verified against production migrations):
 *   brands:            id, name, industry, archetype (no website_url, no target_audience)
 *   brand_audit_v2:    website_url, overall_score, full_report_json
 *   delivery_jobs:     platform, status, created_at
 *   content_analytics: platform, impressions, engagements, clicks, created_at (no ctr)
 *   social_connections: platform, status, expires_at
 *   blog_posts:        status, created_at
 *   campaigns:         status
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
    dnaProfile,
    dnaVoice,
    dnaAudience,
    dnaObjectives,
    dnaPillars,
    dnaCompetitors,
    memoryRows,
  ] = await Promise.all([
    // Only columns that exist on brands table
    db.prepare(`
      SELECT name, industry, archetype
      FROM brands WHERE id = ?
    `).bind(brandId).first(),

    db.prepare(`
      SELECT overall_score, website_url, full_report_json, created_at
      FROM brand_audit_results_v2
      WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(brandId).first(),

    db.prepare(`
      SELECT platform, status, COUNT(*) as count, MAX(created_at) as last_post
      FROM delivery_jobs
      WHERE brand_id = ? AND created_at > datetime('now', '-30 days')
      GROUP BY platform, status
    `).bind(brandId).all(),

    // No ctr column — compute from clicks/impressions
    db.prepare(`
      SELECT platform,
             COUNT(*) as posts,
             SUM(impressions) as total_impressions,
             AVG(engagements) as avg_engagements,
             SUM(clicks) as total_clicks,
             MAX(impressions) as peak_impressions
      FROM content_analytics WHERE brand_id = ?
      GROUP BY platform
    `).bind(brandId).all(),

    db.prepare(`
      SELECT platform AS provider, status, expires_at AS token_expires_at
      FROM social_connections WHERE brand_id = ?
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

    // Brand DNA — strategy, voice, audience, objectives, pillars, competitors
    db.prepare(`
      SELECT mission, positioning, value_proposition, brand_personality, differentiators
      FROM brand_dna_profiles WHERE brand_id = ?
    `).bind(brandId).first().catch(() => null),

    db.prepare(`
      SELECT voice_traits, messaging_style, cta_style
      FROM brand_dna_voice WHERE brand_id = ?
    `).bind(brandId).first().catch(() => null),

    db.prepare(`
      SELECT icp_name, pain_points, desires
      FROM brand_dna_audience WHERE brand_id = ?
    `).bind(brandId).first().catch(() => null),

    db.prepare(`
      SELECT awareness_goal, leads_goal, conversions_goal, authority_goal
      FROM brand_dna_objectives WHERE brand_id = ?
    `).bind(brandId).first().catch(() => null),

    db.prepare(`
      SELECT title FROM brand_dna_content_pillars WHERE brand_id = ? LIMIT 5
    `).bind(brandId).all().catch(() => ({ results: [] })),

    db.prepare(`
      SELECT name, strategy_notes FROM brand_dna_competitors WHERE brand_id = ? LIMIT 4
    `).bind(brandId).all().catch(() => ({ results: [] })),

    // Brand memory — derived signals (preferred platform, top content type, etc.)
    db.prepare(`
      SELECT namespace, key, value, confidence
      FROM brand_memory
      WHERE brand_id = ?
        AND namespace IN ('brand', 'content', 'scheduler', 'customer')
        AND key IN (
          'preferred_platform', 'top_content_type',
          'uses_approval_workflow', 'uses_scheduler',
          'is_team_account', 'has_clients'
        )
    `).bind(brandId).all().catch(() => ({ results: [] })),
  ]);

  // ── Parse audit report ────────────────────────────────────────────────────
  const auditReport = safeJSON(latestAudit?.full_report_json);
  const auditDims   = auditReport?.brand_score?.dimensions   || {};
  const diagSnap    = auditReport?.diagnostic_snapshot       || {};
  const moatMap     = auditReport?.competitive_moat_map      || {};
  const convArch    = auditReport?.conversion_architecture_review || {};
  const contentDNA  = auditReport?.content_genome_analysis   || {};

  // ── Parse Brand DNA ───────────────────────────────────────────────────────
  const voiceTraits  = safeJSON(dnaVoice?.voice_traits, []);
  const painPoints   = safeJSON(dnaAudience?.pain_points, []);
  const desires      = safeJSON(dnaAudience?.desires, []);
  const pillarTitles = (dnaPillars?.results || []).map(p => p.title).filter(Boolean);
  const competitors  = (dnaCompetitors?.results || []);

  // ── Parse brand_memory signals ────────────────────────────────────────────
  const memMap = {};
  for (const r of (memoryRows?.results || [])) {
    try { memMap[r.key] = { value: JSON.parse(r.value), confidence: r.confidence }; } catch {}
  }

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

  const allLastPosts  = Object.values(platformActivity).map(p => p.last_post).filter(Boolean).sort();
  const lastPostDate  = allLastPosts.at(-1) || null;
  const daysSincePost = daysSince(lastPostDate);
  const totalPublished = Object.values(platformActivity).reduce((s, p) => s + p.published, 0);

  // ── Platform connections (using 'provider' column) ────────────────────────
  const connArr     = connectedRows.results || [];
  const connected   = connArr.filter(a => a.status === 'active').map(a => a.provider);
  const expired     = connArr.filter(a => {
    return a.status === 'expired' || a.status === 'revoked' ||
           (a.token_expires_at && new Date(a.token_expires_at) < new Date());
  }).map(a => a.provider);

  // ── Build compact context string ─────────────────────────────────────────
  const L = [];

  L.push(`=== BRAND PROFILE ===`);
  L.push(`Brand: ${brand?.name || 'Unknown'} | Industry: ${brand?.industry || 'Unknown'}`);
  if (brand?.archetype) L.push(`Archetype: ${brand.archetype}`);
  if (latestAudit?.website_url) L.push(`Website: ${latestAudit.website_url}`);

  L.push(`\n=== BRAND AUDIT SNAPSHOT ===`);
  if (latestAudit) {
    L.push(`Score: ${latestAudit.overall_score}/100 | Audited: ${(latestAudit.created_at || '').split('T')[0]}`);
    if (Object.keys(auditDims).length) {
      L.push(`Dimensions: web=${auditDims.web_presence||0} social=${auditDims.social_presence||0} content=${auditDims.content_strategy||0} consistency=${auditDims.brand_consistency||0} conversion=${auditDims.conversion_readiness||0}`);
    }
    const weaknesses = (diagSnap.strategic_weaknesses || []).slice(0, 3);
    if (weaknesses.length) L.push(`Weaknesses: ${weaknesses.join(' | ')}`);
    const opps = (diagSnap.growth_opportunities || []).slice(0, 2);
    if (opps.length) L.push(`Growth Opportunities: ${opps.join(' | ')}`);
    const whitespace = (moatMap.whitespace_opportunities || []).slice(0, 2);
    if (whitespace.length) L.push(`Competitive Whitespace: ${whitespace.join(' | ')}`);
    const contentMix = contentDNA.estimated_content_mix;
    if (contentMix) L.push(`Content Mix: edu=${contentMix.educational||0}% promo=${contentMix.promotional||0}% proof=${contentMix.social_proof||0}% thought=${contentMix.thought_leadership||0}%`);
    const friction = (convArch.conversion_friction_points || []).slice(0, 2);
    if (friction.length) L.push(`Conversion Friction: ${friction.join(' | ')}`);
  } else {
    L.push(`No audit data available.`);
  }

  // ── Brand DNA section (injected into context for intelligence quality) ─────
  const dnaLines = [];
  if (dnaProfile?.mission)           dnaLines.push(`Mission: ${dnaProfile.mission}`);
  if (dnaProfile?.positioning)       dnaLines.push(`Positioning: ${dnaProfile.positioning}`);
  if (dnaProfile?.value_proposition) dnaLines.push(`Value Prop: ${dnaProfile.value_proposition}`);
  if (voiceTraits.length)            dnaLines.push(`Voice: ${voiceTraits.slice(0, 4).join(', ')}`);
  if (dnaVoice?.messaging_style)     dnaLines.push(`Messaging Style: ${dnaVoice.messaging_style}`);
  if (dnaAudience?.icp_name)         dnaLines.push(`Target Audience: ${dnaAudience.icp_name}`);
  if (painPoints.length)             dnaLines.push(`Audience Pain Points: ${painPoints.slice(0, 3).join(' | ')}`);
  if (desires.length)                dnaLines.push(`Audience Desires: ${desires.slice(0, 2).join(' | ')}`);
  if (dnaObjectives?.awareness_goal) dnaLines.push(`Awareness Goal: ${dnaObjectives.awareness_goal}`);
  if (dnaObjectives?.leads_goal)     dnaLines.push(`Leads Goal: ${dnaObjectives.leads_goal}`);
  if (dnaObjectives?.authority_goal) dnaLines.push(`Authority Goal: ${dnaObjectives.authority_goal}`);
  if (pillarTitles.length)           dnaLines.push(`Content Pillars: ${pillarTitles.join(', ')}`);
  if (competitors.length) {
    const compStr = competitors.map(c => c.strategy_notes ? `${c.name} (${c.strategy_notes.slice(0, 60)})` : c.name).join(' | ');
    dnaLines.push(`Competitors: ${compStr}`);
  }

  if (dnaLines.length) {
    L.push(`\n=== BRAND DNA ===`);
    L.push(...dnaLines);
  } else {
    L.push(`\n=== BRAND DNA ===`);
    L.push(`Not yet configured. Recommendations will be based on activity data only.`);
  }

  // ── Memory signals section ────────────────────────────────────────────────
  const memLines = [];
  if (memMap.preferred_platform)       memLines.push(`Preferred Platform: ${memMap.preferred_platform.value} (confidence ${memMap.preferred_platform.confidence})`);
  if (memMap.top_content_type)         memLines.push(`Top Content Type: ${memMap.top_content_type.value}`);
  if (memMap.uses_approval_workflow?.value) memLines.push(`Uses Approval Workflow: yes`);
  if (memMap.uses_scheduler?.value)    memLines.push(`Uses Scheduler: yes`);
  if (memMap.is_team_account?.value)   memLines.push(`Account Type: team`);
  if (memMap.has_clients?.value)       memLines.push(`Has Client Accounts: yes`);

  if (memLines.length) {
    L.push(`\n=== BRAND MEMORY (LEARNED SIGNALS) ===`);
    L.push(...memLines);
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
      // Compute CTR from clicks/impressions since no ctr column exists
      const ctr = row.total_impressions > 0
        ? ((row.total_clicks / row.total_impressions) * 100).toFixed(2) + '%'
        : '0%';
      L.push(`${row.platform || 'unknown'}: posts=${row.posts} impressions=${row.total_impressions||0} avg_eng=${eng} clicks=${row.total_clicks||0} ctr=${ctr} peak=${row.peak_impressions||0}`);
    }
  } else {
    L.push(`No content analytics data yet.`);
  }

  L.push(`\n=== PLATFORM CONNECTIONS ===`);
  L.push(`Connected: ${connected.join(', ') || 'none'} | Expired/Broken: ${expired.join(', ') || 'none'}`);
  L.push(`Total Integrations: ${connArr.length}`);

  L.push(`\n=== CONTENT LIBRARY ===`);
  L.push(`Blog Posts: published=${blogStats?.published||0} drafts=${blogStats?.drafts||0} last_published=${(blogStats?.last_published||'').split('T')[0] || 'never'}`);
  L.push(`Campaigns: total=${campaignStats?.total||0} active=${campaignStats?.active||0}`);

  const context = L.join('\n');
  const tokens  = Math.ceil(context.length / 4);
  console.log(`[INTEL_CONTEXT_SIZE] ~${tokens}tok for brand=${brandId}`);

  return { context, tokens };
}
