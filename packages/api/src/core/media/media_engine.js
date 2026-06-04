/**
 * myPilotPost — Media Intelligence Engine
 * Orchestrates: brief → fetch → dedupe → rank → group
 * Returns: { featured[4], recommended[12], byCategory, more[20] }
 * No LLM. No new routes. Uses existing Pexels provider + KV cache.
 */

import { generateBrief } from './brief.js';
import { fetchPexels }    from './providers/pexels.js';
import { dedupe }         from './dedupe.js';
import { rankImages }     from './ranking.js';
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
  // Remove internal scoring field before returning
  const { _score, ...clean } = img;
  return clean;
}

export async function runMediaEngine({ platform, contentType, text, brand, industry }, env) {
  const brief = generateBrief({ platform, contentType, text, brand, industry });

  // Cache check
  const cached = await cacheGet(brief.query, platform, env);
  if (cached) return cached;

  // Fetch
  const raw = await fetchPexels({ query: brief.query, orientation: brief.orientation, limit: 40 }, env);

  // Dedupe
  const unique = dedupe(raw);

  // Rank
  const ranked = rankImages(unique, { tags: brief.tags, orientation: brief.orientation });

  // Group
  const featured      = ranked.slice(0, 4).map(strip);
  const recommended   = ranked.slice(4, 16).map(strip);
  const more          = ranked.slice(16, 36).map(strip);
  const byCategory    = groupByCategory(ranked.map(strip));

  const result = { featured, recommended, more, byCategory, meta: { query: brief.query, orientation: brief.orientation } };

  // Cache and return
  await cacheSet(brief.query, platform, result, env);
  return result;
}
