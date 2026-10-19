// packages/api/src/core/studio/prewarm.js
//
// Daily pre-warm for the AI Content Studio Discover feed.
// For each active brand it (1) generates the day's feed (same code path as an
// on-demand open, just moved earlier) and (2) renders each card's PNG into R2
// under the EXACT key the render-preview endpoint looks up, so the user's first
// Discover open is a cache HIT (~5-7ms) instead of a live render (~0.7-1.4s).
//
// Budget note: rendering is CPU-bound WASM. 20 cards x N brands in a single
// Worker invocation can exceed the CPU limit, so this runs on the every-4-hours
// cron in bounded batches (a Redis day-marker prevents re-warming a brand twice
// the same day). See runStudioPrewarm().

import { getDB } from "../../lib/db.js";
import { kvGetRaw, kvPutRaw } from "../../lib/kvcache.js";
import { getStudioOpportunities } from "./studio.js";
import { getCertifiedTemplate } from "../templates/registry.js";
import { computePreviewR2Key, renderPreviewBuffer } from "../templates/templateRoutes.js";

/**
 * Replicate EXACTLY what DynamicOpportunityCard sends to /render-preview:
 *   template_id = the fetched schema's internal template_id (getTemplate(...).template_id)
 *   variant     = card.template_variant || "A"
 *   headline/body/cta/image_url with the same fallbacks the frontend uses.
 * Returns null if the template id is unknown (skip, per the getTemplate null contract).
 */
export function deriveRenderInputs(card, env) {
  const routingId = card.template_id || card.suggested_template_id;
  if (!routingId) return null;
  const core = getCertifiedTemplate(routingId);
  if (!core) return null;

  const pd = card.preview_data || {};
  return {
    templateId: core.id,
    variant: card.template_variant || card.suggested_template_variant || "A",
    headline: pd.headline || card.hook || "Your Headline",
    body: pd.body || "",
    cta: pd.cta || "Learn More",
    imageUrl: pd.hero_image_url || "",
  };
}

/** Pre-warm one brand's feed + card renders. Isolated so one brand can't abort the batch. */
export async function prewarmBrandStudio(env, brandId, ownerUserId) {
  const stats = { brand: brandId, cards: 0, rendered: 0, cached: 0, skipped: 0, errors: 0 };

  let resp;
  try {
    // request arg is unused by getStudioOpportunities; pass a minimal stub.
    resp = await getStudioOpportunities({ url: "https://cron.local/prewarm" }, env, {
      brand_id: brandId,
      user_id: ownerUserId,
    });
  } catch (e) {
    console.error(`[PREWARM] feed generation threw for brand ${brandId}: ${e.message}`);
    stats.errors++;
    return stats;
  }
  if (!resp || resp.status >= 400) {
    console.warn(`[PREWARM] feed generation returned ${resp?.status} for brand ${brandId}; skipping renders (likely quota/no-content).`);
    return stats;
  }

  let data;
  try { data = await resp.json(); } catch { return stats; }
  const opps = Array.isArray(data.opportunities) ? data.opportunities : [];
  stats.cards = opps.length;

  if (!env.MEDIA_BUCKET) {
    console.warn("[PREWARM] MEDIA_BUCKET not bound; cannot pre-render.");
    return stats;
  }

  for (const card of opps) {
    const inp = deriveRenderInputs(card, env);
    if (!inp) { stats.skipped++; continue; }

    const r2Key = computePreviewR2Key(brandId, inp.templateId, inp.variant, inp.headline, inp.body, inp.cta, inp.imageUrl);
    try {
      const head = await env.MEDIA_BUCKET.head(r2Key);
      if (head) { stats.cached++; continue; } // already warm from a prior run/view

      const buf = await renderPreviewBuffer({ brandId, ...inp }, env);
      if (!buf) { stats.skipped++; continue; } // unknown template

      await env.MEDIA_BUCKET.put(r2Key, buf, { httpMetadata: { contentType: "image/png" } });
      stats.rendered++;
    } catch (e) {
      console.error(`[PREWARM] render failed brand ${brandId} card ${card.id}: ${e.message}`);
      stats.errors++;
    }
  }

  console.log(`[PREWARM] brand ${brandId}: cards=${stats.cards} rendered=${stats.rendered} cached=${stats.cached} skipped=${stats.skipped} errors=${stats.errors}`);
  return stats;
}

/**
 * Bounded batch across active brands. Runs on the every-4-hours cron; a Redis
 * day-marker keeps each brand to one warm per day, so ~limit x 6 brands/day are
 * covered without doing all brands in one CPU-heavy invocation.
 */
export async function runStudioPrewarm(env, { limit = 5 } = {}) {
  const db = getDB(env);
  const today = new Date().toISOString().slice(0, 10);

  const { results: brands } = await db.prepare(`
    SELECT b.id AS id, b.owner_user_id AS owner_user_id
    FROM brands b
    WHERE b.owner_user_id IS NOT NULL
      AND b.id IN (
        SELECT DISTINCT brand_id FROM delivery_jobs   WHERE created_at > datetime('now', '-30 days')
        UNION
        SELECT DISTINCT brand_id FROM content_analytics WHERE created_at > datetime('now', '-30 days')
      )
    LIMIT 200
  `).all();

  const summary = [];
  let processed = 0;
  for (const b of (brands || [])) {
    if (processed >= limit) break;

    // KV day-marker: warm each brand at most once per day, so the every-4-hours cron
    // doesn't re-generate (and re-bill the owner's AI quota) on every tick.
    const marker = `studio_prewarm_done_${b.id}_${today}`;
    if (await kvGetRaw(env.STUDIO_CACHE_KV, marker)) continue;

    const s = await prewarmBrandStudio(env, b.id, b.owner_user_id);
    summary.push(s);
    processed++;

    // 20h TTL keeps the marker alive across the day's remaining ticks but lets the next
    // calendar day re-warm.
    await kvPutRaw(env.STUDIO_CACHE_KV, marker, "1", 20 * 60 * 60);
  }

  console.log(`[PREWARM] run complete: processed ${processed} brand(s), ${summary.reduce((n, s) => n + s.rendered, 0)} card(s) rendered`);
  return summary;
}
