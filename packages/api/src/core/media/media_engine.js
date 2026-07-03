import { generateBrief, generateSlotQuery } from './brief.js';
import { buildVisualContext } from './visual_context.js';
import { fetchPexels }        from './providers/pexels.js';
import { fetchUnsplash }      from './providers/unsplash.js';
import { fetchPixabay }       from './providers/pixabay.js';
import { fetchAdobeStock }    from './providers/adobe_stock.js';
import { dedupe }             from './dedupe.js';
import { rankImages, assignCategory } from './ranking.js';
import { cacheGet, cacheSet } from './providers/cache.js';
import { getDB }              from '../../lib/db.js';
import { expandVisualBriefs } from './brief_expansion.js';
import { extractPalette }     from './colorExtractor.js';

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

function selectDiverseFeatured(ranked, count = 4) {
  const ORDER = ['human', 'professional', 'minimal', 'general'];
  const byCategory = { human: [], professional: [], minimal: [], general: [] };
  for (const img of ranked) {
    const cat = img.category || 'general';
    if (byCategory[cat]) byCategory[cat].push(img);
  }

  const picked = [];
  for (const cat of ORDER) {
    if (picked.length >= count) break;
    const best = byCategory[cat][0];
    if (best) picked.push(best);
  }
  for (const img of ranked) {
    if (picked.length >= count) break;
    if (!picked.includes(img)) picked.push(img);
  }
  return picked.slice(0, count);
}

function buildCuratedList(ranked, limit, skip = []) {
  const skipSet = new Set(skip.map(s => s.id || s.external_id));
  const pool = ranked.filter(img => !skipSet.has(img.id || img.external_id));

  const out = [];
  const categoryRun = {};
  const categoryTotal = {};

  for (const img of pool) {
    if (out.length >= limit) break;
    const cat = img.category || 'general';

    const run   = categoryRun[cat]   || 0;
    const total = categoryTotal[cat] || 0;

    if (total >= 4) continue;
    if (run >= 2) continue;

    out.push(img);
    categoryTotal[cat] = total + 1;

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
  const STOPWORDS = new Set([
    "a", "an", "the", "of", "to", "in", "on", "at", "for", "with", "by", "about", 
    "against", "during", "before", "after", "above", "below", "from", "up", "down", 
    "over", "under", "again", "further", "then", "once", "and", "or", "but", "is", 
    "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", 
    "did", "this", "that", "these", "those", "up", "out", "into", "over", "under",
    "some", "many", "few", "more", "most", "other", "somehow", "closeup", "close-up",
    "photo", "image", "photography", "shot", "view"
  ]);

  const stem = word => {
    let w = word.toLowerCase();
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
    if (w.endsWith('ing')) return w.slice(0, -3);
    if (w.endsWith('ed')) return w.slice(0, -2);
    return w;
  };

  const cleanTokens = text => {
    return (text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
      .map(stem);
  };

  const imgWords = new Set(cleanTokens(img.alt));
  if (imgWords.size === 0) return 0.0;

  const queries = brief.search_queries || [];
  let queryTerms = new Set();
  queries.forEach(q => {
    cleanTokens(q).forEach(term => queryTerms.add(term));
  });

  let queryMatches = 0;
  for (const term of queryTerms) {
    if (imgWords.has(term)) queryMatches++;
  }
  const queryScore = queryTerms.size > 0 ? (queryMatches / queryTerms.size) : 0.0;

  const descWords = new Set([
    ...cleanTokens(brief.visual_description),
    ...(brief.mood_tags || []).flatMap(t => cleanTokens(t))
  ]);

  let descMatches = 0;
  for (const w of descWords) {
    if (imgWords.has(w)) descMatches++;
  }
  const unionSize = descWords.size + imgWords.size - descMatches;
  const descriptionScore = unionSize > 0 ? (descMatches / unionSize) : 0.0;

  return (0.60 * queryScore) + (0.40 * descriptionScore);
}

function getBayesianScore(img, visualPerformance) {
  const category = img.category || 'general';
  const perf = visualPerformance[category] || { impressions: 10, clicks: 1 };
  const alpha = 1;
  const beta = 9;
  return (perf.clicks + alpha) / (perf.impressions + alpha + beta);
}

export async function runMediaEngine(params, env) {
  const { slots, platform = 'instagram', brandId, brand_id } = params;
  const targetBrandId = brandId || brand_id;

  // ==========================================
  // NEW BEHAVIOR: Per-slot media processing
  // ==========================================
  if (slots && Array.isArray(slots)) {
    const db = getDB(env);
    let industry = "General";
    let brandName = "this brand";
    let primary_color = null;
    let secondary_color = null;
    if (targetBrandId) {
      try {
        const brandRow = await db.prepare("SELECT name, industry FROM brands WHERE id = ?").bind(targetBrandId).first();
        if (brandRow) {
          brandName = brandRow.name || brandName;
          industry = brandRow.industry || industry;
        }
        const visualRow = await db.prepare("SELECT primary_color, secondary_color FROM brand_dna_visual_identity WHERE brand_id = ?").bind(targetBrandId).first();
        if (visualRow) {
          primary_color = visualRow.primary_color;
          secondary_color = visualRow.secondary_color;
        }
      } catch (e) {
        console.warn("[MEDIA ENGINE] Failed to fetch brand context from database", e);
      }
    }

    // Fetch active Adobe connection
    let hasAdobe = false;
    if (targetBrandId) {
      try {
        const conn = await db
          .prepare(`SELECT id FROM social_connections WHERE brand_id = ? AND platform = 'adobe' AND status = 'active'`)
          .bind(targetBrandId)
          .first();
        if (conn) hasAdobe = true;
      } catch (err) {
        console.error('[MEDIA ENGINE ADOBE CHECK ERROR]', err);
      }
    }

    // Fetch visual performance metrics for MAB CTR boost
    const visualPerformance = {};
    if (targetBrandId) {
      try {
        const rows = await db
          .prepare(`SELECT feature_name, impressions, clicks FROM visual_feature_performance WHERE brand_id = ?`)
          .bind(targetBrandId)
          .all();
        for (const r of rows.results || []) {
          visualPerformance[r.feature_name] = r;
        }
      } catch (err) {
        console.error('[MAB PRIORS ERROR]', err?.message);
      }
    }

    // Parallel fetch candidates per slot
    const slotFetchPromises = slots.map(async (slot) => {
      const augmented_query = generateSlotQuery(slot.query, industry, slot.slot_type, platform);
      
      const providers = [
        fetchPexels({ query: augmented_query, limit: 12 }, env).catch(() => []),
        fetchUnsplash({ query: augmented_query, limit: 12 }, env).catch(() => []),
        fetchPixabay({ query: augmented_query, limit: 12 }, env).catch(() => [])
      ];
      
      if (hasAdobe) {
        providers.push(fetchAdobeStock({ query: augmented_query, limit: 12 }, env).catch(() => []));
      }
      
      const results = await Promise.all(providers);
      const rawPool = results.flat();
      const uniquePool = dedupe(rawPool).map(img => ({
        ...img,
        category: assignCategory(img)
      }));
      
      return {
        slot,
        augmented_query,
        candidates: uniquePool
      };
    });

    const slotsWithCandidates = await Promise.all(slotFetchPromises);

    // Compute scores and gather match pairs for greedy assignment
    const matches = [];
    const orientation = platform === "instagram" ? "portrait" : "landscape";

    slotsWithCandidates.forEach((slotData) => {
      const slot = slotData.slot;
      const visualContext = buildVisualContext({ industry, title: slot.query, format: "feed_post" });
      const slotRequirements = {
        required_aspect_ratio: slot.required_aspect_ratio,
        min_width: slot.min_width,
        min_height: slot.min_height
      };

      const ranked = rankImages(slotData.candidates, {
        tags: [slot.query],
        orientation,
        visualContext,
        slotRequirements
      });

      ranked.forEach(img => {
        const bayesian = getBayesianScore(img, visualPerformance);
        const finalScore = (0.70 * img._score) + (0.30 * bayesian);
        matches.push({
          slotId: slot.slot_id,
          img,
          score: finalScore
        });
      });
    });

    // Sort matches descending by score
    matches.sort((a, b) => b.score - a.score);

    // Bipartite greedy assignment (ensures unique image per slot inside the same post)
    const assignedImages = {};
    const assignedImageIds = new Set();

    for (const match of matches) {
      if (!assignedImages[match.slotId]) {
        const imgId = match.img.id || match.img.external_id;
        if (!assignedImageIds.has(imgId)) {
          assignedImages[match.slotId] = match.img;
          assignedImageIds.add(imgId);
        }
      }
    }

    // Backfill and fallback if slots are missing images
    slotsWithCandidates.forEach((slotData, sIdx) => {
      const slotId = slotData.slot.slot_id;
      if (!assignedImages[slotId]) {
        for (const img of slotData.candidates) {
          const imgId = img.id || img.external_id;
          if (!assignedImageIds.has(imgId)) {
            assignedImages[slotId] = img;
            assignedImageIds.add(imgId);
            break;
          }
        }
      }

      if (!assignedImages[slotId]) {
        const url = FALLBACK_POOL[sIdx % FALLBACK_POOL.length];
        const fallbackImg = {
          id: `fallback_${slotId}_${sIdx}`,
          external_id: `fallback_${slotId}_${sIdx}`,
          url,
          preview: url,
          thumbnail_url: url,
          author: 'myPilotPost Curated',
          attribution: 'Curated selection',
          provider: 'pexels',
          category: 'general',
          width: 1080,
          height: 1080
        };
        assignedImages[slotId] = fallbackImg;
        assignedImageIds.add(fallbackImg.id);
      }
    });

    // Format return JSON with dynamic color extraction
    const result = {};
    for (const [slotId, img] of Object.entries(assignedImages)) {
      const palette = await extractPalette(
        img.url,
        2,
        { primary_color, secondary_color },
        env
      );
      result[slotId] = {
        image_url: img.url,
        author: img.author || 'myPilotPost Curated',
        dimensions: {
          width: img.width || 1080,
          height: img.height || 1080
        },
        palette
      };
    }
    return result;
  }

  // ==========================================
  // BACKWARD COMPATIBILITY: Legacy behavior
  // ==========================================
  const { contentType = 'social', format, text = '', title = '', brand = '', industry = '', goal = '', brandDna = null, batch = null } = params;
  const isSingle = !batch || !batch.length;
  const visualContext = buildVisualContext({ industry, title, goal, format, brandDna });
  const cacheKey = `${text.slice(0, 40)}::${format || 'social'}::${visualContext.industryKey || 'generic'}`;

  if (isSingle) {
    const cached = await cacheGet(cacheKey, platform, env).catch(() => null);
    if (cached) return cached;
  }

  let briefs = [];
  if (batch && batch.length) {
    briefs = await expandVisualBriefs({ batch, brand, env, brand_id: brandDna?.brand_id });
  }

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

  // Fetch Adobe details
  let hasAdobe = false;
  if (brandDna?.brand_id) {
    try {
      const db = getDB(env);
      const conn = await db
        .prepare(`SELECT id FROM social_connections WHERE brand_id = ? AND platform = 'adobe' AND status = 'active'`)
        .bind(brandDna.brand_id)
        .first();
      if (conn) hasAdobe = true;
    } catch (err) {
      console.error('[MEDIA ENGINE ADOBE CHECK ERROR]', err);
    }
  }

  const uniqueQueries = [...new Set(briefs.flatMap(b => b.search_queries))].slice(0, 10);
  const fetchPromises = uniqueQueries.flatMap(q => {
    const list = [
      fetchPexels({ query: q, orientation: visualContext.expectedCategories?.includes('portrait') ? 'portrait' : 'landscape', limit: 12 }, env).catch(() => []),
      fetchUnsplash({ query: q, orientation: visualContext.expectedCategories?.includes('portrait') ? 'portrait' : 'landscape', limit: 12 }, env).catch(() => []),
      fetchPixabay({ query: q, orientation: visualContext.expectedCategories?.includes('portrait') ? 'portrait' : 'landscape', limit: 12 }, env).catch(() => [])
    ];
    if (hasAdobe) {
      list.push(fetchAdobeStock({ query: q, limit: 12 }, env).catch(() => []));
    }
    return list;
  });

  const fetchedResults = await Promise.all(fetchPromises);
  const raw = fetchedResults.flat();
  const uniqueCandidates = dedupe(raw).map(img => ({
    ...img,
    category: assignCategory(img)
  }));

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
