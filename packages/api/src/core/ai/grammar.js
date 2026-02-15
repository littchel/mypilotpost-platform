import { json } from "../../lib/json.js";
import { logEvent } from "../../lib/events.js";

/**
 * Grammar engine (Phase 2)
 * Returns suggestions, not forced rewrite
 */
export async function grammarCheck(request, env, auth) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    text,
    content_id = null,
    accept_grammar = null
  } = body || {};

  if (!text) {
    return json({ issues: [] });
  }

  // Placeholder for real grammar engine
  const issues = [];

  // Example rule
  if (text.includes("teh ")) {
    issues.push({
      original: "teh",
      suggestion: "the",
      reason: "Common spelling mistake"
    });
  }

  const correctedText =
    issues.length
      ? text.replace(/\bteh\b/g, "the")
      : text;

  /* ===============================
     EVENT LOGGING (NON-BLOCKING)
  =============================== */
  try {
    if (auth?.brand_id) {
      await logEvent(env, {
        event_type: "grammar_checked",
        brand_id: auth.brand_id,
        user_id: auth.user_id || null,
        content_id,
        metadata: {
          issues_count: issues.length,
          accepted: accept_grammar === true
        }
      });
    }
  } catch (err) {
    // Never block grammar on analytics failure
    console.error("[grammarCheck:event]", err?.message || err);
  }

  return json({
    issues,
    corrected_text: correctedText
  });
}
