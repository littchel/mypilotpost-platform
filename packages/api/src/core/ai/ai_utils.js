/**
 * myPilotPost — AI STRATEGIC UTILITIES
 * Production Pro-Elite Recovery & Quality Guards
 */

export function escapeRawJSONStrings(str) {
  let result = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && !escaped) {
      inString = !inString;
    }
    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else if (char === '\b') {
        result += '\\b';
      } else if (char === '\f') {
        result += '\\f';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
    if (char === '\\' && !escaped) {
      escaped = true;
    } else {
      escaped = false;
    }
  }
  return result;
}

/**
 * healJSON(str)
 * Implements a regex-based recovery engine for truncated or invalid AI JSON.
 */
export function healJSON(str) {
  if (!str) return null;
  const preprocessed = escapeRawJSONStrings(str);
  try {
    return JSON.parse(preprocessed);
  } catch (e) {
    // 1. Attempt to extract the first { ... } block
    const match = preprocessed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    
    let healed = match[0];
    
    // 2. Brace Balancing: Close unmatched opening braces
    const openBraces = (healed.match(/\{/g) || []).length;
    const closeBraces = (healed.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      healed += "}".repeat(openBraces - closeBraces);
    }
    
    // 3. Array Balancing: Close unmatched opening brackets
    const openBrackets = (healed.match(/\[/g) || []).length;
    const closeBrackets = (healed.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      healed += "]".repeat(openBrackets - closeBrackets);
    }

    try {
      return JSON.parse(healed);
    } catch (e2) {
      // 4. Final attempt: Truncate at last valid key-value pair if needed
      // (Simplified for now, returning null for high-entropy failures to trigger fallback)
      return null;
    }
  }
}

/**
 * sanitizeActions(actions)
 * Enforces quality, diversity, and length constraints on AI-generated tactics.
 */
export function sanitizeActions(actions) {
  if (!Array.isArray(actions)) return [];
  
  // 1. Length & Quality Filter
  let filtered = actions.filter(a => typeof a === 'string' && a.length >= 10);
  
  // 2. Deduplication (Semantic Similarity - Basic Overlap)
  const result = [];
  for (const action of filtered) {
    const isSimilar = result.some(existing => {
      const wordsA = new Set(action.toLowerCase().split(' '));
      const wordsB = new Set(existing.toLowerCase().split(' '));
      const intersection = [...wordsA].filter(x => wordsB.has(x));
      // If > 70% word overlap, treat as semantically similar
      return (intersection.length / Math.max(wordsA.size, wordsB.size)) > 0.7;
    });
    
    if (!isSimilar) {
      result.push(action);
    }
  }
  
  // 3. Diversity Constraint: Limit to top 3
  return result.slice(0, 3);
}

/**
 * getCacheTTL(source)
 * Differentiated caching strategy for AI vs Fallback insight.
 */
export function getCacheTTL(source) {
  if (source === 'fallback' || source === 'limited') {
    return 3 * 60 * 1000; // 3 minutes for fallbacks
  }
  return 8 * 60 * 1000; // 8 minutes for high-fidelity AI
}
