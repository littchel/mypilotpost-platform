/**
 * myPilotPost — AI PRODUCTION PRO-ELITE CLIENT
 * Multi-tier Cascade, Success Memory & Strategic Recovery
 */

import { healJSON, sanitizeActions } from "./ai_utils.js";

/**
 * hardenedRunLLM(env, brand, prompt, options)
 * Implements the 2.7s/1.2s time-split cascade with 24h success memory.
 */
export async function hardenedRunLLM(env, brand, prompt, options = {}) {
  const { mode = 'deep' } = options;
  const now = new Date();
  
  // 1. First-Run Priority: Force 70B for the first user impression
  const isFirstRun = !brand.first_ai_run_at;
  
  // 2. Success Memory Logic (24H Reset)
  let primaryModel = "llama3-70b-8192";
  const lastSuccess = brand.last_ai_success_at ? new Date(brand.last_ai_success_at) : null;
  const isMemoryValid = lastSuccess && (now - lastSuccess < 24 * 60 * 60 * 1000);
  
  if (!isFirstRun && isMemoryValid && brand.last_ai_model === "llama3-8b-8192") {
    primaryModel = "llama3-8b-8192"; // Prioritize last successful model
  }

  // Override if mode is 'fast' (Dashboard)
  if (mode === 'fast') primaryModel = "llama3-8b-8192";

  // 3. Execution Cascade
  let result = null;
  let usedModel = null;
  let path = [];

  // TIER 1: Primary Model (70B at 2.7s OR Success Memory)
  path.push(primaryModel);
  result = await triggerModelWithTimeout(env, primaryModel, prompt, 2700);
  
  // TIER 2: Secondary / Fallback Model (8B at 1.2s)
  if (!result && primaryModel === "llama3-70b-8192") {
    path.push("llama3-8b-8192 (retry)");
    result = await triggerModelWithTimeout(env, "llama3-8b-8192", prompt, 1200);
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
        confidence: usedModel.includes('70b') ? "high" : "medium",
        _performance: { model: usedModel, path, latency: result.latency }
      };
    }
  }

  // 5. Hard Failure -> Trigger Fallback
  return null;
}

async function triggerModelWithTimeout(env, model, prompt, ms) {
  const controller = new AbortController();
  const timeoutMs = ms === 2700 ? 15000 : 8000; // Increase significantly for local dev
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
          { role: "system", content: "You are a senior social media strategist. Always justify recommendations with real metrics. Respond in strict JSON." },
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
    console.log(`Groq AI Success (${model}) in ${Date.now() - start}ms`);
    return {
      output: data.choices[0].message.content,
      model: data.model,
      latency: Date.now() - start
    };
  } catch (err) {
    console.error(`Groq AI Exception (${model}): ${err.message}`);
    return null; // Timeout or Network Failure
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
