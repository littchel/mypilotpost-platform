/**
 * myPilotPost — Media Intelligence Engine v2
 * Orchestrates: brief → fetch → dedupe → rank → curate → group
 * Returns: { featured[4], recommended[12], byCategory, more[20], meta }
 * No LLM. No new routes. Uses existing Pexels provider + KV cache.
 */

import { generateBrief } from './brief.js';
import { fetchPexels }   from './providers/pexels.js';
import { dedupe }        from './dedupe.js';
import { rankImages }    from './ranking.js';
import { cacheGet, cacheSet } from './providers/cache.js';

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

export async function runMediaEngine(
  { platform, contentType, format, text = '', title = '', brand = '', industry = '', goal = '' },
  env
) {
  const brief = generateBrief({ platform, contentType, format, text, title, brand, industry, goal });

  // Cache key includes format for format-specific caching
  const cacheKey = `${brief.query}::${brief.format}`;
  const cached = await cacheGet(cacheKey, platform, env).catch(() => null);
  if (cached) return cached;

  // Fetch wider pool to survive stricter quality filter (1600px floor)
  const raw = await fetchPexels({ query: brief.query, orientation: brief.orientation, limit: 60 }, env);

  // Deduplicate (author limit 2, URL dedup)
  const unique = dedupe(raw);

  // Rank with full brief context
  const ranked = rankImages(unique, {
    tags:        brief.tags,
    orientation: brief.orientation,
    subjects:    brief.subjects,
  });

  const confidence = calcConfidence(ranked);

  // Agency Picks: diverse (1 per category) or fallback to minimal/editorial
  let featured;
  if (confidence < 70 && ranked.length > 0) {
    // Low confidence — prefer minimal/editorial over random
    const editorialFirst = [...ranked].sort((a, b) => {
      const scoreA = (a.category === 'minimal' || a.category === 'professional') ? 1 : 0;
      const scoreB = (b.category === 'minimal' || b.category === 'professional') ? 1 : 0;
      return scoreB - scoreA || b._score - a._score;
    });
    featured = editorialFirst.slice(0, 4);
  } else {
    featured = selectDiverseFeatured(ranked, 4);
  }

  const recommended = buildCuratedList(ranked, 16, featured);
  const more = ranked
    .filter(img => !featured.includes(img) && !recommended.includes(img))
    .slice(0, 20);

  const byCategory = groupByCategory(ranked.map(strip));

  const result = {
    featured:    featured.map(strip),
    recommended: recommended.map(strip),
    more:        more.map(strip),
    byCategory,
    meta: {
      query:       brief.query,
      orientation: brief.orientation,
      style:       brief.style,
      format:      brief.format,
      confidence,
    },
  };

  await cacheSet(cacheKey, platform, result, env).catch(() => {});
  return result;
}
