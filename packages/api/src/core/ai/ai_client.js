/**
 * myPilotPost — AI PRODUCTION PRO-ELITE CLIENT
 * Multi-tier Cascade, Success Memory & Strategic Recovery
 */

import { healJSON, sanitizeActions } from "./ai_utils.js";

const SYSTEM_PROMPTS = {
  social:   "You are an expert social media copywriter. Write compelling, brand-specific content that earns attention and drives action. Respond in strict JSON only.",
  blog:     "You are an expert content strategist and SEO writer. Write thorough, brand-aligned articles that inform and convert. Respond in strict JSON only.",
  campaign: "You are a senior digital marketing strategist. Build evidence-based campaign plans grounded in the brand's actual situation. Respond in strict JSON only.",
  utility:  "You are a professional writing assistant. Be concise and accurate. Respond in strict JSON only.",
};

/**
 * hardenedRunLLM(env, brand, prompt, options)
 * Implements the 2.7s/1.2s time-split cascade with 24h success memory.
 */
export async function hardenedRunLLM(env, brand, prompt, options = {}) {
  const { mode = 'deep', systemPromptType = 'social' } = options;
  const systemPrompt = SYSTEM_PROMPTS[systemPromptType] || SYSTEM_PROMPTS.social;
  const now = new Date();
  
  // 1. First-Run Priority: Force 70B for the first user impression
  const isFirstRun = !brand.first_ai_run_at;
  
  // 2. Success Memory Logic (24H Reset)
  let primaryModel = "llama-3.3-70b-versatile";
  const lastSuccess = brand.last_ai_success_at ? new Date(brand.last_ai_success_at) : null;
  const isMemoryValid = lastSuccess && (now - lastSuccess < 24 * 60 * 60 * 1000);

  if (!isFirstRun && isMemoryValid && brand.last_ai_model === "llama-3.1-8b-instant") {
    primaryModel = "llama-3.1-8b-instant";
  }

  // Override if mode is 'fast' (Dashboard)
  if (mode === 'fast') primaryModel = "llama-3.1-8b-instant";

  // 3. Execution Cascade
  let result = null;
  let usedModel = null;
  let path = [];

  // TIER 1: Primary Model (70B OR Success Memory)
  path.push(primaryModel);
  result = await triggerModelWithTimeout(env, primaryModel, prompt, 15000, systemPrompt);

  // TIER 2: Fast fallback
  if (!result && primaryModel === "llama-3.3-70b-versatile") {
    path.push("llama-3.1-8b-instant (retry)");
    result = await triggerModelWithTimeout(env, "llama-3.1-8b-instant", prompt, 8000, systemPrompt);
  }

  // 4. Recovery & Normalization
  if (result) {
    usedModel = result.model;
    const healed = healJSON(result.output);
    if (healed) {
      // Success: Update Memory
      return {
        ...healed,
        source: "ai",
        confidence: usedModel.includes('70b') || usedModel.includes('3.3') ? "high" : "medium",
        _performance: { model: usedModel, path, latency: result.latency, tokens_used: result.tokens || 0 }
      };
    }
  }

  // 5. Hard Failure -> Trigger Fallback
  return null;
}

async function triggerModelWithTimeout(env, model, prompt, timeoutMs, systemPrompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  if (!env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is MISSING in environment!");
    return null;
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 2048
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Groq API Error (${model}): ${res.status} ${errorText}`);
      return null;
    }
    const data = await res.json();
    console.log(`Groq AI Success (${model}) in ${Date.now() - start}ms tokens=${data.usage?.total_tokens || 0}`);
    return {
      output: data.choices[0].message.content,
      model: data.model,
      latency: Date.now() - start,
      tokens: data.usage?.total_tokens ||
              ((data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0)),
    };
  } catch (err) {
    console.error(`Groq AI Exception (${model}): ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * runLLM(env, prompt, options)
 * Backward compatibility wrapper for hardenedRunLLM
 */
export async function runLLM(env, prompt, options = {}) {
  const brandContext = options.brand || { archetype: 'Strategic Builder' };
  const res = await hardenedRunLLM(env, brandContext, prompt, options);
  if (!res) return { output: "{}" };
  return {
    output: typeof res === 'object' ? JSON.stringify(res) : res,
    model: res._performance?.model || "unknown",
    latency: res._performance?.latency || 0
  };
}

/**
 * trackedRunLLM — wraps hardenedRunLLM with ai_generations + ai_usage_quota tracking.
 * Call this from route handlers where brand_id and user_id are known.
 */
export async function trackedRunLLM(env, {
  brand,
  prompt,
  brand_id,
  user_id = null,
  content_type = "general",
  platform = null,
  options = {},
}) {
  const start = Date.now();
  let result = null;
  let status = "ok";

  try {
    result = await hardenedRunLLM(env, brand, prompt, options);
    if (!result) status = "failed";
  } catch (_err) {
    status = "failed";
  }

  const latency_ms = Date.now() - start;
  const tokens = result?._performance?.tokens_used || 0;
  const model   = result?._performance?.model || "llama3-70b-8192";

  if (brand_id) {
    try {
      const { getDB } = await import("../../lib/db.js");
      const db = getDB(env);

      await db.prepare(`
        INSERT INTO ai_generations
          (id, brand_id, user_id, content_type, platform, input_prompt, output,
           model, provider, tokens_used, latency_ms, success, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'groq', ?, ?, ?, ?, datetime('now'))
      `).bind(
        crypto.randomUUID(), brand_id, user_id, content_type, platform,
        prompt.slice(0, 2000),
        result ? JSON.stringify(result) : null,
        model, tokens, latency_ms,
        status === "ok" ? 1 : 0,
        status
      ).run();

      if (user_id) {
        const today = new Date().toISOString().slice(0, 10);
        await db.prepare(`
          INSERT INTO ai_usage_quota (user_id, brand_id, date, generation_count, token_count)
          VALUES (?, ?, ?, 1, ?)
          ON CONFLICT(user_id, brand_id, date)
          DO UPDATE SET
            generation_count = generation_count + 1,
            token_count = token_count + excluded.token_count
        `).bind(user_id, brand_id, today, tokens).run();
      }
    } catch (_e) {
      // fail-soft — tracking must not block generation
    }
  }

  return result;
}

/**
 * GET /api/customer/ai/usage
 * Returns today's generation count and token usage for the authenticated user.
 */
export async function getAIUsage(request, env, auth) {
  const { json, error } = await import("../../lib/json.js");
  if (!auth?.user_id || !auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const { getDB } = await import("../../lib/db.js");
  const db = getDB(env);
  const today = new Date().toISOString().slice(0, 10);

  const row = await db.prepare(`
    SELECT generation_count, token_count
    FROM ai_usage_quota
    WHERE user_id = ? AND brand_id = ? AND date = ?
  `).bind(auth.user_id, auth.brand_id, today).first();

  return json({
    date: today,
    generation_count: row?.generation_count || 0,
    token_count:      row?.token_count      || 0,
  });
}
