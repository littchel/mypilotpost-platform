import { generateBrief }     from './brief.js';
import { buildVisualContext } from './visual_context.js';
import { fetchPexels }        from './providers/pexels.js';
import { fetchUnsplash }      from './providers/unsplash.js';
import { fetchPixabay }       from './providers/pixabay.js';
import { dedupe }             from './dedupe.js';
import { rankImages, assignCategory } from './ranking.js';
import { cacheGet, cacheSet } from './providers/cache.js';
import { getDB }              from '../../lib/db.js';
import { expandVisualBriefs } from './brief_expansion.js';

const FALLBACK_POOL = [
  "https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3760809/pexels-photo-3760809.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3182781/pexels-photo-3182781.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1"
];

function groupByCategory(images) {
  const out = { human: [], professional: [], minimal: [], general: [] };
  for (const img of images) {
    const cat = img.category || 'general';
    if (out[cat]) out[cat].push(img);
    else out.general.push(img);
  }
  return out;
}

function strip(img) {
  const { _score, ...clean } = img;
  return clean;
}

/**
 * Pick 4 diverse featured images — one from each category where possible.
 * This makes Agency Picks feel curated, not randomly top-4.
 */
function selectDiverseFeatured(ranked, count = 4) {
  const ORDER = ['human', 'professional', 'minimal', 'general'];
  const byCategory = { human: [], professional: [], minimal: [], general: [] };
  for (const img of ranked) {
    const cat = img.category || 'general';
    if (byCategory[cat]) byCategory[cat].push(img);
  }

  const picked = [];
  // One best from each category
  for (const cat of ORDER) {
    if (picked.length >= count) break;
    const best = byCategory[cat][0];
    if (best) picked.push(best);
  }
  // Fill remaining from top overall
  for (const img of ranked) {
    if (picked.length >= count) break;
    if (!picked.includes(img)) picked.push(img);
  }
  return picked.slice(0, count);
}

/**
 * Build recommended list with category interleaving.
 * Avoids showing 5 identical corporate photos in a row.
 * Enforces: max 2 same category adjacent, max 3 same category total per slot.
 */
function buildCuratedList(ranked, limit, skip = []) {
  const skipSet = new Set(skip.map(s => s.id || s.external_id));
  const pool = ranked.filter(img => !skipSet.has(img.id || img.external_id));

  const out = [];
  const categoryRun = {}; // consecutive count per category
  const categoryTotal = {};

  for (const img of pool) {
    if (out.length >= limit) break;
    const cat = img.category || 'general';

    const run   = categoryRun[cat]   || 0;
    const total = categoryTotal[cat] || 0;

    // Soft cap: no more than 4 of any one category in recommended
    if (total >= 4) continue;
    // Adjacency cap: no more than 2 consecutive same category
    if (run >= 2) continue;

    out.push(img);
    categoryTotal[cat] = total + 1;

    // Reset run counts on category change
    const lastCat = out.length > 1 ? (out[out.length - 2]?.category || 'general') : null;
    if (lastCat !== cat) Object.keys(categoryRun).forEach(k => (categoryRun[k] = 0));
    categoryRun[cat] = run + 1;
  }

  return out;
}

function calcConfidence(ranked) {
  if (!ranked.length) return 0;
  const top = ranked.slice(0, Math.min(10, ranked.length));
  const avg = top.reduce((s, r) => s + (r._score || 0), 0) / top.length;
  return Math.round(avg * 100);
}

function computeSemanticScore(brief, img) {
  const altWords = new Set((img.alt || '').toLowerCase().split(/[^a-z0-9]+/));
  const briefWords = new Set([
    ...(brief.mood_tags || []).map(t => t.toLowerCase()),
    ...(brief.visual_description || '').toLowerCase().split(/[^a-z0-9]+/)
  ].filter(w => w.length > 3));

  let intersection = 0;
  for (const w of briefWords) {
    if (altWords.has(w)) intersection++;
  }
  const union = briefWords.size + altWords.size - intersection;
  return union > 0 ? (intersection / union) : 0.0;
}

function getBayesianScore(img, visualPerformance) {
  const category = img.category || 'general';
  const perf = visualPerformance[category] || { impressions: 10, clicks: 1 };
  const alpha = 1;
  const beta = 9;
  return (perf.clicks + alpha) / (perf.impressions + alpha + beta);
}

export async function runMediaEngine(
  { platform, contentType, format, text = '', title = '', brand = '', industry = '', goal = '', brandDna = null, batch = null },
  env
) {
  // If single request, cache matching applies
  const isSingle = !batch || !batch.length;
  const visualContext = buildVisualContext({ industry, title, goal, format, brandDna });
  const cacheKey = `${text.slice(0, 40)}::${format || 'social'}::${visualContext.industryKey || 'generic'}`;

  if (isSingle) {
    const cached = await cacheGet(cacheKey, platform, env).catch(() => null);
    if (cached) return cached;
  }

  // 1. LLM Batch Visual Brief Expansion
  let briefs = [];
  if (batch && batch.length) {
    briefs = await expandVisualBriefs({ batch, brand, env, brand_id: brandDna?.brand_id });
  }

  // Virtual batch of 1 if single post request, or fallback if LLM failed
  if (!briefs.length) {
    const fallbackList = batch && batch.length ? batch : [{ title, caption: text }];
    briefs = fallbackList.map((p, idx) => {
      const b = generateBrief({ platform, contentType, format, text: p.caption, title: p.title, brand, industry, goal, brandDna });
      return {
        postId: idx,
        search_queries: [b.query, `${industry || 'business'} visual`, `${brand || 'brand'} professional`],
        visual_description: p.title || p.caption || 'Business and professional elements',
        mood_tags: b.tags || ['professional', 'clean']
      };
    });
  }

  // 2. Parallel Labeled Fetching
  // Deduplicate query string array to restrict subrequest limits
  const uniqueQueries = [...new Set(briefs.flatMap(b => b.search_queries))].slice(0, 10);
  
  const fetchPromises = uniqueQueries.flatMap(q => [
    fetchPexels({ query: q, orientation: visualContext.expectedCategories?.includes('portrait') ? 'portrait' : 'landscape', limit: 12 }, env).catch(() => []),
    fetchUnsplash({ query: q, orientation: visualContext.expectedCategories?.includes('portrait') ? 'portrait' : 'landscape', limit: 12 }, env).catch(() => []),
    fetchPixabay({ query: q, orientation: visualContext.expectedCategories?.includes('portrait') ? 'portrait' : 'landscape', limit: 12 }, env).catch(() => [])
  ]);

  const fetchedResults = await Promise.all(fetchPromises);
  const raw = fetchedResults.flat();

  // Deduplicate raw candidate pool
  const uniqueCandidates = dedupe(raw).map(img => ({
    ...img,
    category: assignCategory(img)
  }));

  // 3. MAB Prior Category CTR CTR Boost
  const visualPerformance = {};
  if (brandDna?.brand_id) {
    try {
      const db = getDB(env);
      const rows = await db
        .prepare(`SELECT feature_name, impressions, clicks FROM visual_feature_performance WHERE brand_id = ?`)
        .bind(brandDna.brand_id)
        .all();
      for (const r of rows.results || []) {
        visualPerformance[r.feature_name] = r;
      }
    } catch (err) {
      console.error('[MAB PRIORS ERROR]', err?.message);
    }
  }

  // 4. Semantic Scoring & Bipartite Greedy Assignment
  const assignedImages = new Array(briefs.length).fill(null);
  const assignedImageIds = new Set();
  const matches = [];

  briefs.forEach((brief, bIdx) => {
    uniqueCandidates.forEach(img => {
      const semantic = computeSemanticScore(brief, img);
      const bayesian = getBayesianScore(img, visualPerformance);
      const score = (0.70 * semantic) + (0.30 * bayesian);
      matches.push({ bIdx, img, score });
    });
  });

  // Sort score descending
  matches.sort((a, b) => b.score - a.score);

  for (const match of matches) {
    if (assignedImages[match.bIdx] === null) {
      const imgId = match.img.id || match.img.external_id;
      if (!assignedImageIds.has(imgId)) {
        assignedImages[match.bIdx] = match.img;
        assignedImageIds.add(imgId);
      }
    }
  }

  // Backfill any unmatched entries
  briefs.forEach((brief, bIdx) => {
    if (assignedImages[bIdx] === null) {
      for (const img of uniqueCandidates) {
        const imgId = img.id || img.external_id;
        if (!assignedImageIds.has(imgId)) {
          assignedImages[bIdx] = img;
          assignedImageIds.add(imgId);
          break;
        }
      }
    }
    // Final absolute fallbacks if pool exhausted
    if (assignedImages[bIdx] === null) {
      const url = FALLBACK_POOL[bIdx % FALLBACK_POOL.length];
      assignedImages[bIdx] = {
        id: `fallback_${bIdx}`,
        external_id: `fallback_${bIdx}`,
        url,
        preview: url,
        thumbnail_url: url,
        author: 'myPilotPost Curated',
        attribution: 'Curated selection',
        provider: 'pexels',
        category: 'general',
        width: 1920,
        height: 1080
      };
    }
  });

  const confidence = calcConfidence(uniqueCandidates);
  const byCategory = groupByCategory(uniqueCandidates.map(strip));

  const result = {
    featured:    assignedImages.slice(0, 4).map(strip),
    recommended: assignedImages.slice(4, 20).map(strip),
    more:        uniqueCandidates.filter(img => !assignedImageIds.has(img.id || img.external_id)).slice(0, 20).map(strip),
    all:         assignedImages.map(strip),
    byCategory,
    meta: {
      query:         uniqueQueries.join(', '),
      confidence,
      visual_context: visualContext,
    },
  };

  if (isSingle) {
    await cacheSet(cacheKey, platform, result, env).catch(() => {});
  }

  return result;
}
