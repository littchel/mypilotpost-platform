/**
 * myPilotPost — SEO ENGINE (LIGHT & STRATEGIC)
 * AUTHORITATIVE • V1
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { checkFeatureAccess } from "../billing/billing.js";

/**
 * analyzeContentSEO
 * Main entry point for content analysis.
 * Weights: Placement (40%), Readability (25%), Length (20%), Quality (15%)
 */
export async function analyzeContentSEO(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'seo');
  if (!access.allowed) return access.response;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return error("Invalid JSON body", "BAD_REQUEST", null, 400);
  }

  const { content, text, title, keywords = {}, type = 'social' } = body || {};
  const finalContent = content || text;
  
  const primary = keywords.primary?.trim();
  const secondary = Array.isArray(keywords.secondary) ? keywords.secondary : [];

  const results = {
    score: 0,
    readability_score: 0,
    metrics: {
      word_count: 0,
      keyword_density: 0,
      sentence_count: 0
    },
    suggestions: []
  };

  if (!finalContent) return json(results);

  // 1. Metrics Gathering
  const words = finalContent.split(/\s+/).filter(w => w.length > 0);
  const sentences = finalContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
  results.metrics.word_count = words.length;
  results.metrics.sentence_count = sentences.length;

  const avgSentenceLength = results.metrics.sentence_count > 0 
    ? results.metrics.word_count / results.metrics.sentence_count 
    : 0;

  // 2. Readability Analysis (25%)
  let readScore = 100;
  if (avgSentenceLength > 25) readScore = 40;
  else if (avgSentenceLength > 20) readScore = 70;
  else if (avgSentenceLength < 15) readScore = 100;
  
  results.readability_score = readScore;
  if (readScore < 70) results.suggestions.push("Improve readability by shortening your sentences.");

  // 3. Length Analysis (20%)
  let lengthScore = 0;
  if (type === 'blog') {
    if (results.metrics.word_count >= 600) lengthScore = 100;
    else if (results.metrics.word_count >= 300) lengthScore = 60;
    else lengthScore = 20;

    if (results.metrics.word_count < 600) {
      results.suggestions.push("This content is a bit short for deep SEO impact. Aim for 600+ words.");
    }
  } else {
    // Social optimization (DISCOVERY focused)
    if (results.metrics.word_count > 20 && results.metrics.word_count < 100) lengthScore = 100;
    else lengthScore = 70;
  }

  // 4. Keyword Placement (40%) & Quality (15%)
  let placementScore = 100;
  let qualityScore = 100;

  if (primary) {
    let hits = 0;
    const searchBody = finalContent.toLowerCase();
    const searchTitle = (title || "").toLowerCase();
    const searchPrimary = primary.toLowerCase();

    // Placement Checks
    const inTitle = searchTitle.includes(searchPrimary);
    const inFirst100 = searchBody.slice(0, 500).includes(searchPrimary);
    
    if (!inTitle && type === 'blog') {
      placementScore -= 50;
      results.suggestions.push(`Add your primary keyword "${primary}" to the title.`);
    }
    if (!inFirst100) {
      placementScore -= 30;
      results.suggestions.push(`Add "${primary}" to your opening paragraph.`);
    }

    // Quality / Density
    const count = (searchBody.match(new RegExp(searchPrimary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    results.metrics.keyword_density = (count / results.metrics.word_count) * 100;
    
    if (results.metrics.keyword_density > 5) {
      qualityScore = 40;
      results.suggestions.push("Keyword density is too high; ensure the flow feels natural and avoids 'stuffing'.");
    } else if (results.metrics.keyword_density < 0.5) {
      qualityScore = 60;
      results.suggestions.push(`Use your primary keyword "${primary}" at least once or twice in the body.`);
    }
  } else {
    // ADAPTIVE FALLBACK: If no keyword, ignore placement/quality and scale others
    placementScore = 0;
    qualityScore = 0;
    results.suggestions.push("Add a target keyword to unlock advanced SEO placement scoring.");
  }

  // Final Weighted Calculation
  if (primary) {
    results.score = Math.round(
      (placementScore * 0.40) + 
      (readScore * 0.25) + 
      (lengthScore * 0.20) + 
      (qualityScore * 0.15)
    );
  } else {
    // SCALE Readability (50%) and Length (50%) when no keyword exists
    results.score = Math.round(
      (readScore * 0.60) + 
      (lengthScore * 0.40)
    );
  }

  return json(results);
}

/**
 * saveSEOData
 * Persists SEO snapshots for content
 */
export async function saveSEOData(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(request, env, auth, 'seo');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const data = await request.json();
  const { content_id, content_type, keywords, title, seo_score, readability_score } = data;

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO seo_pages (id, brand_id, content_id, content_type, keyword_primary, keyword_secondary, title, seo_score, readability_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      keyword_primary = EXCLUDED.keyword_primary,
      keyword_secondary = EXCLUDED.keyword_secondary,
      title = EXCLUDED.title,
      seo_score = EXCLUDED.seo_score,
      readability_score = EXCLUDED.readability_score,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    id, auth.brand_id, content_id, content_type, 
    keywords?.primary, JSON.stringify(keywords?.secondary || []), 
    title, seo_score, readability_score
  ).run();

  return json({ success: true, id });
}

/* ======================================================
   SEO DASHBOARD ENDPOINTS
====================================================== */

export async function getSEOSummary(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const brandId = auth.brand_id;

  const pageStats = await db.prepare(`
    SELECT COUNT(*) as page_count, AVG(seo_score) as avg_seo, AVG(readability_score) as avg_read
    FROM seo_pages WHERE brand_id = ?
  `).bind(brandId).first();

  const kwCount = (await db.prepare(`SELECT COUNT(*) as c FROM seo_keywords WHERE brand_id = ?`).bind(brandId).first())?.c || 0;

  const pageCount = pageStats?.page_count || 0;
  const avgSEO    = Math.round(pageStats?.avg_seo  || 0);
  const avgRead   = Math.round(pageStats?.avg_read  || 0);

  const keywordCoverage  = Math.min(100, kwCount * 10);
  const readabilityIndex = avgRead || 60;
  const eeatMaturity     = pageCount > 0 ? Math.min(100, Math.round(avgSEO * 0.8)) : 20;
  const globalScore      = pageCount === 0 ? 0 : Math.round(keywordCoverage * 0.3 + readabilityIndex * 0.3 + eeatMaturity * 0.4);

  const topRecommendation = kwCount === 0
    ? 'Add your target keywords to start tracking SEO opportunities.'
    : pageCount === 0
    ? 'Analyze your published content to measure SEO performance.'
    : avgSEO < 50
    ? 'Improve keyword density and meta descriptions to boost your SEO score.'
    : 'Your SEO foundation is solid. Focus on publishing consistently and building topical authority.';

  const eeatFactors = [
    { name: 'Experience',      score: Math.min(100, pageCount * 10 + 20), desc: 'Content breadth and depth across topics',       color: '#2563eb' },
    { name: 'Expertise',       score: avgSEO || 40,                        desc: 'Keyword optimization and content quality',       color: '#10b981' },
    { name: 'Authority',       score: Math.min(100, kwCount * 8 + 15),     desc: 'Keyword portfolio strength and coverage',        color: '#f59e0b' },
    { name: 'Trustworthiness', score: readabilityIndex,                     desc: 'Content readability and structural clarity',     color: '#6366f1' },
  ];

  return json({ globalScore, keywordCoverage, readabilityIndex, eeatMaturity, topRecommendation, eeatFactors });
}

export async function getSEOKeywords(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const brandId = auth.brand_id;

  const { results } = await db.prepare(`
    SELECT sk.id, sk.keyword AS term, sk.intent, sk.priority, sk.created_at,
      COUNT(skt.id) AS target_count
    FROM seo_keywords sk
    LEFT JOIN seo_keyword_targets skt ON skt.keyword_id = sk.id AND skt.brand_id = sk.brand_id
    WHERE sk.brand_id = ?
    GROUP BY sk.id
    ORDER BY sk.priority DESC, sk.created_at DESC
    LIMIT 50
  `).bind(brandId).all();

  const VOLUME_MAP  = { 3: '50K+', 2: '10K', 1: '5K', 0: '1K' };
  const DIFF_MAP    = { commercial: 'High', transactional: 'Medium', informational: 'Low', local: 'Low' };
  const INTENT_MAP  = { commercial: 'Commercial', transactional: 'Transactional', informational: 'Informational', local: 'Informational' };

  const mapped = (results || []).map(kw => ({
    id: kw.id,
    term: kw.term,
    status: (kw.target_count || 0) > 0 ? 'Targeting' : 'Opportunity',
    volume: VOLUME_MAP[kw.priority] || '1K',
    difficulty: DIFF_MAP[kw.intent?.toLowerCase()] || 'Medium',
    intent: INTENT_MAP[kw.intent?.toLowerCase()] || 'Commercial',
    avgWords: 900,
    wordScore: 60,
    competitors: [],
    recommendations: [
      `Include "${kw.term}" in your next article headline.`,
      'Create a dedicated landing page targeting this keyword.'
    ]
  }));

  return json(mapped);
}
