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
        max_tokens: 1000
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
  // Use provided brand or minimal fallback
  const brandContext = options.brand || { archetype: 'Strategic Builder' };
  
  const res = await hardenedRunLLM(env, brandContext, prompt, options);
  
  if (!res) return { output: "{}" };
  
  return {
    output: typeof res === 'object' ? JSON.stringify(res) : res,
    model: res._performance?.model || "unknown",
    latency: res._performance?.latency || 0
  };
}
