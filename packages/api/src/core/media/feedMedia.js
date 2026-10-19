// packages/api/src/core/media/feedMedia.js
//
// One place the Discover feed picks a hero image. Unlike the old feed path (Pexels
// only, first result), this:
//   1. keys on the card's concrete visual_query + the brand's industry,
//   2. queries ALL active sources (Pexels + Unsplash + Pixabay) into one pool,
//   3. ranks the merged pool for relevance (rejecting text/word-stock puns),
//   4. caches the ranked search results (KV, 7 days) to spare provider rate limits.
// Search caching is separate from the render/PNG (R2) cache.

import { fetchPexels } from "./providers/pexels.js";
import { fetchUnsplash } from "./providers/unsplash.js";
import { fetchPixabay } from "./providers/pixabay.js";
import { rankImages } from "./ranking.js";
import { cacheGet, cacheSet } from "./providers/cache.js";

const SEARCH_TTL = 60 * 60 * 24 * 7; // 7 days

/**
 * @returns the ranked candidate array (best first), or [] if nothing found.
 * Cached and reused for the same (visual_query + industry + orientation).
 */
export async function searchAndRankMedia({ visualQuery, industry, orientation = "landscape" }, env) {
  const subject = String(visualQuery || "").trim();
  const query = [subject, industry].filter(Boolean).join(" ").trim().slice(0, 100);
  if (!query) return [];

  const cacheK = `${query}::${orientation}`;

  // 1. Search-result cache (keyed by visual_query + industry + orientation)
  const cached = await cacheGet(cacheK, "feed", env);
  if (Array.isArray(cached) && cached.length) return cached;

  // 2. Query every active source in parallel, merge into one pool
  const [px, us, pb] = await Promise.all([
    fetchPexels({ query, orientation, limit: 20 }, env).catch(() => []),
    fetchUnsplash({ query, orientation, limit: 20 }, env).catch(() => []),
    fetchPixabay({ query, orientation, limit: 20 }, env).catch(() => []),
  ]);
  const pool = [...(px || []), ...(us || []), ...(pb || [])];
  if (!pool.length) return [];

  // 3. Rank the combined pool. Tags come from the concrete visual_query (not the
  //    headline), so true-subject matches win; text/word-stock puns are rejected in
  //    ranking.js's shouldReject.
  const tags = subject.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const subjects = [subject, industry].filter(Boolean);
  const ranked = rankImages(pool, { tags, orientation, subjects });
  const result = ranked && ranked.length ? ranked : pool;

  // 4. Cache the ranked results (7 days) — cheap repeat lookups, fewer provider calls
  await cacheSet(cacheK, "feed", result, env, SEARCH_TTL).catch(() => {});
  return result;
}
