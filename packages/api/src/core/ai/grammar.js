// packages/api/src/core/ai/grammar.js

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { logEvent } from "../../lib/events.js";
import { trackedRunLLM } from "./ai_client.js";
import { checkAndIncrement } from "../billing/enforcement.js";

export async function grammarCheck(request, env, auth) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", "INVALID_JSON", null, 400);
  }

  const { text } = body || {};

  if (!text) {
    return json({ correctedText: "", suggestions: [] });
  }

  const prompt = `Fix all grammar, spelling, and punctuation errors in the text below.
Preserve the author's voice and intent. Do not change meaning.

Text: "${text.slice(0, 1500)}"

Respond in strict JSON:
{
  "corrected": "corrected version of the full text",
  "suggestions": ["brief description of each change made"]
}`;

  let correctedText = text;
  let suggestions = [];

  if (auth?.brand_id) {
    const db = getDB(env);
    await checkAndIncrement(db, auth.user_id, "ai");
    const brand = await db.prepare("SELECT id, name, industry FROM brands WHERE id = ?").bind(auth.brand_id).first();

    const result = await trackedRunLLM(env, {
      brand,
      prompt,
      brand_id: auth.brand_id,
      user_id: auth.user_id || null,
      content_type: "grammar",
      options: { mode: 'fast', systemPromptType: 'utility' },
    });
    if (result?.corrected) {
      correctedText = result.corrected;
      suggestions = result.suggestions || [];
    }
  }

  try {
    if (auth?.brand_id) {
      const db = getDB(env);
      await logEvent(env, {
        event_type: "grammar_checked",
        brand_id: auth.brand_id,
        user_id: auth.user_id || null,
        metadata: { original_length: text.length, suggestions_count: suggestions.length }
      });
    }
  } catch (err) {
    console.error("[grammarCheck:event]", err);
  }

  return json({ correctedText, suggestions });
}
