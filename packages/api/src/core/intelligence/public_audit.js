/**
 * myPilotPost — Public Brand Audit Orchestrator (v4 — Evidence-Driven)
 *
 * Flow:
 *  1. Crawl website URL
 *  2. Discover social profiles
 *  3. Generate 13-section audit via Groq
 *  4. Persist result
 *  5. Return structured report
 *
 * Input: { website_url, brand_name? }
 * No hardcoded metrics. No template recommendations. No fake evidence.
 */

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { crawlWebsite } from "./website_crawler.js";
import { discoverSocialProfiles, summariseSocialProfiles } from "./social_discovery.js";
import { generateGroqAudit } from "./groq_audit_engine.js";

// ─── GET /api/public/brand-audit/:id ────────────────────────────────────────

export async function getPublicAuditById(request, env, auditId) {
  const db = getDB(env);
  try {
    const audit = await db.prepare(`
      SELECT id, brand_name, website_url, overall_score, score_breakdown_json,
             strategic_actions_json, next_steps_json, full_report_json,
             industry, preview_mode, created_at
      FROM brand_audit_results_v2 WHERE id = ?
    `).bind(auditId).first();

    if (!audit) return json({ error: 'Audit not found' }, 404);

    const fullReport = audit.full_report_json ? JSON.parse(audit.full_report_json) : null;

    return json({
      audit_id: audit.id,
      brand_name: audit.brand_name,
      website_url: audit.website_url,
      overall_score: audit.overall_score,
      score_breakdown: JSON.parse(audit.score_breakdown_json || '{}'),
      strategic_analysis: JSON.parse(audit.strategic_actions_json || '[]'),
      next_steps: JSON.parse(audit.next_steps_json || '[]'),
      industry: audit.industry || '',
      full_report: fullReport,
      preview_mode: audit.preview_mode,
      created_at: audit.created_at,
    });
  } catch (err) {
    return json({ error: 'Failed to retrieve audit' }, 500);
  }
}

// ─── POST /api/public/brand-audit ───────────────────────────────────────────

export async function runPublicAudit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { website_url, brand_name } = body;

  if (!website_url || typeof website_url !== 'string') {
    return json({ error: 'website_url is required' }, 400);
  }

  const rawUrl = website_url.trim();
  console.log(`[AUDIT_START] url="${rawUrl}" brand="${brand_name || ''}"`);

  // ── Step 1: Crawl website ────────────────────────────────────────────────
  let website;
  try {
    website = await crawlWebsite(rawUrl);
    const crawlBodyLen   = website.body_text?.length || 0;
    const crawlHeadsLen  = website.headings?.join('').length || 0;
    const crawlSocialLen = JSON.stringify(website.social_links || {}).length;
    console.log(`[AUDIT_CRAWL_SIZE] body_text=${crawlBodyLen}ch headings=${crawlHeadsLen}ch social_links=${crawlSocialLen}ch total=~${crawlBodyLen + crawlHeadsLen + crawlSocialLen}ch`);
    console.log(`[AUDIT_CRAWL] accessible=${website.accessible} title="${website.title}" socialLinks=${Object.keys(website.social_links).length}`);
  } catch (err) {
    console.error('[AUDIT_CRAWL_ERROR]', err.message);
    website = { url: rawUrl, accessible: false, error: err.message, social_links: {}, headings: [], body_text: '', ctas: [], emails: [], page_types: {} };
  }

  // If user supplied a brand name and we didn't find a title, use it
  if (brand_name && !website.title) {
    website.title = brand_name;
  }

  // ── Step 2: Discover social profiles ────────────────────────────────────
  let socialProfiles = {};
  let socialSummary = 'Social profile discovery not attempted.';
  try {
    socialProfiles = await discoverSocialProfiles(website.social_links, rawUrl);
    socialSummary = summariseSocialProfiles(socialProfiles);
    console.log(`[AUDIT_SOCIAL] found=${Object.values(socialProfiles).filter(p => p?.found).length}`);
  } catch (err) {
    console.error('[AUDIT_SOCIAL_ERROR]', err.message);
    socialSummary = `Social discovery failed: ${err.message}`;
  }

  // ── Step 3: Generate audit via Groq ─────────────────────────────────────
  let audit;
  try {
    audit = await generateGroqAudit(website, socialSummary, env);
    console.log(`[AUDIT_GROQ] company="${audit.business_profile?.company_name}" industry="${audit.business_profile?.industry}" score=${audit.brand_score?.overall}`);
  } catch (err) {
    console.error('[AUDIT_GROQ_ERROR]', err.message);
    return json({ error: `Audit generation failed: ${err.message}` }, 500);
  }

  // ── Step 4: Normalise and extract DB fields ──────────────────────────────
  const companyName = audit.business_profile?.company_name || brand_name || (() => {
    try { return new URL(rawUrl).hostname.replace(/^www\./, ''); } catch { return rawUrl; }
  })();

  const industry = audit.business_profile?.industry || 'Unknown';
  const overallScore = Number(audit.brand_score?.overall) || 0;

  const scoreBreakdown = audit.brand_score?.dimensions || {};
  const strategicActions = (audit.strategic_roadmap?.quick_wins || []).map(item => ({
    metric: item.action,
    cause: item.references_issue,
    recommendation: item.action,
    expected_outcome: item.expected_outcome,
    business_impact: item.business_impact,
    timeframe: item.timeframe,
  }));

  const nextSteps = [
    ...(audit.strategic_roadmap?.quick_wins || []).map(i => i.action),
    ...(audit.strategic_roadmap?.growth_plays || []).map(i => i.action),
  ].slice(0, 5);

  // ── Step 5: Persist ──────────────────────────────────────────────────────
  const audit_id = crypto.randomUUID();

  const db = getDB(env);
  try {
    await db.prepare(`
      INSERT INTO brand_audit_results_v2 (
        id, brand_name, website_url, social_handles,
        overall_score, score_breakdown_json, strategic_actions_json,
        next_steps_json, full_report_json, industry,
        goals_json, platforms_json, preview_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      audit_id,
      companyName,
      rawUrl,
      JSON.stringify(Object.entries(socialProfiles).filter(([, v]) => v?.found).map(([p, v]) => `${p}: ${v.url}`)),
      overallScore,
      JSON.stringify(scoreBreakdown),
      JSON.stringify(strategicActions),
      JSON.stringify(nextSteps),
      JSON.stringify(audit),
      industry,
      '[]',
      JSON.stringify(Object.keys(socialProfiles).filter(p => socialProfiles[p]?.found)),
    ).run();
    console.log(`[AUDIT_SAVED] id=${audit_id} score=${overallScore} industry="${industry}"`);
  } catch (err) {
    console.error('[AUDIT_DB_ERROR]', err.message);
    // Don't fail — return the result even if DB write fails
  }

  // ── Step 6: Return ───────────────────────────────────────────────────────
  return json({
    audit_id,
    brand_name: companyName,
    website_url: rawUrl,
    industry,
    overall_score: overallScore,
    score_breakdown: scoreBreakdown,
    strategic_analysis: strategicActions,
    next_steps: nextSteps,
    full_report: audit,
    social_profiles: socialProfiles,
    website_crawl: {
      accessible: website.accessible,
      title: website.title,
      social_links_found: Object.keys(website.social_links),
    },
  });
}

// ─── POST /api/public/audit-lead ────────────────────────────────────────────

export async function captureAuditLead(request, env) {
  const { audit_id, name, email, business_name } = await request.json();
  const db = getDB(env);

  const audit = await db.prepare("SELECT * FROM brand_audit_results_v2 WHERE id = ?").bind(audit_id).first();
  if (!audit) return json({ error: 'Audit not found' }, 404);

  await db.prepare(`
    UPDATE brand_audit_results_v2
    SET lead_name = ?, lead_email = ?, lead_business_name = ?, lead_captured_at = datetime('now')
    WHERE id = ?
  `).bind(name, email, business_name, audit_id).run();

  await db.prepare(`
    INSERT INTO public_audit_leads (id, email, brand_name, website_url, audit_id, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT DO NOTHING
  `).bind(crypto.randomUUID(), email, business_name, audit?.website_url, audit_id).run();

  return json({ success: true });
}
