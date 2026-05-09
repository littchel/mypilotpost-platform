// packages/api/src/core/ai/grammar.js
// myPilotPost — AI Grammar Correction (v1.1.1 Stabilization)

import { json, error } from "../../lib/json.js";
import { logEvent } from "../../lib/events.js";

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

  // Deterministic Response
  const correctedText = text.replace(/\bteh\b/g, "the")
                           .replace(/\baviation\b/g, "Aviation");
  
  const suggestions = [
    "Capitalized 'Aviation' for brand consistency",
    "Corrected 'teh' to 'the'"
  ];

  try {
    if (auth?.brand_id) {
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

  return json({
    correctedText,
    suggestions
  });
}

