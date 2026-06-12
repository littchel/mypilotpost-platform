// packages/api/src/api/admin/usage.js
// Config → Limits. Financial/operational usage. Sources: ai_generations, media_assets,
// delivery_jobs, usage_tracking. Estimated cost only where a provider rate is known.

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

// Per-1K-token cost (USD). Used only where ai_generations.cost_usd is null.
const TOKEN_RATE = { groq: 0.00010, openai: 0.00200, anthropic: 0.00300 };

export async function getAdminUsage(request, env) {
  const db  = getDB(env);
  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "30"), 90);
  const since = `datetime('now','-${days} day')`;

  // ── AI tokens + cost by provider ──────────────────────────────────────────
  const { results: aiRows } = await db.prepare(`
    SELECT provider,
      COUNT(*) AS generations,
      COALESCE(SUM(tokens_used),0) AS tokens,
      COALESCE(SUM(cost_usd),0)    AS billed_cost_usd,
      AVG(latency_ms)              AS avg_latency_ms,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failures
    FROM ai_generations
    WHERE created_at > ${since}
    GROUP BY provider
  `).all().catch(() => ({ results: [] }));

  const ai = (aiRows || []).map(r => {
    const rate = TOKEN_RATE[r.provider] ?? 0;
    const est = (r.billed_cost_usd && r.billed_cost_usd > 0)
      ? r.billed_cost_usd
      : (r.tokens / 1000) * rate;
    return {
      provider: r.provider,
      generations: r.generations,
      tokens: r.tokens,
      cost_usd: Number(est.toFixed(4)),
      cost_source: (r.billed_cost_usd && r.billed_cost_usd > 0) ? "billed" : "estimated",
      avg_latency_ms: r.avg_latency_ms ? Math.round(r.avg_latency_ms) : null,
      failures: r.failures || 0,
    };
  });
  const ai_total_tokens = ai.reduce((a, r) => a + r.tokens, 0);
  const ai_total_cost   = Number(ai.reduce((a, r) => a + r.cost_usd, 0).toFixed(4));

  // ── Media provider usage (Pexels / Adobe / Freepik / upload) ──────────────
  const { results: mediaRows } = await db.prepare(`
    SELECT provider, COUNT(*) AS imports
    FROM media_assets WHERE created_at > ${since} GROUP BY provider
  `).all().catch(() => ({ results: [] }));
  const media_providers = (mediaRows || []).map(m => ({ provider: m.provider, imports: m.imports }));

  // ── X (twitter) delivery usage ────────────────────────────────────────────
  const xRow = await db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed
    FROM delivery_jobs
    WHERE platform IN ('x','twitter') AND created_at > ${since}
  `).first().catch(() => ({}));

  // ── Adobe usage (Express imports tracked as media provider) ───────────────
  const adobe = (media_providers.find(m => m.provider === "adobe") || { imports: 0 });

  // ── Storage / bandwidth proxy (asset counts) ──────────────────────────────
  const storageRow = await db.prepare("SELECT COUNT(*) AS assets FROM media_assets").first().catch(() => ({}));

  // ── AI quota (period buckets) ─────────────────────────────────────────────
  const quotaRow = await db.prepare(`
    SELECT COALESCE(SUM(generation_count),0) AS gens, COALESCE(SUM(token_count),0) AS tokens
    FROM ai_usage_quota WHERE date > date('now','-${days} day')
  `).first().catch(() => ({}));

  return json({
    window_days: days,
    ai: {
      by_provider: ai,
      total_tokens: ai_total_tokens,
      total_cost_usd: ai_total_cost,
    },
    media_providers,
    pexels:  { imports: (media_providers.find(m => m.provider === "pexels")  || { imports: 0 }).imports },
    freepik: { imports: (media_providers.find(m => m.provider === "freepik") || { imports: 0 }).imports },
    adobe:   { imports: adobe.imports },
    x: { total: xRow?.total || 0, published: xRow?.published || 0, failed: xRow?.failed || 0 },
    storage: { total_assets: storageRow?.assets || 0 },
    quota: { generations: quotaRow?.gens || 0, tokens: quotaRow?.tokens || 0 },
    estimated_monthly_cost_usd: ai_total_cost, // AI is the only metered cost source
    generated_at: new Date().toISOString(),
  });
}
