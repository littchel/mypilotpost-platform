// packages/api/src/core/ai/media/media_suggest.js
// myPilotPost — Media Intelligence Suggestions (AUTHORITATIVE v1)

import { scoreMedia } from "./media_score.js";
import { PLATFORM_MEDIA_RULES } from "./media_rules.js";

/**
 * Suggest ranked media for AI-generated content.
 *
 * Used in:
 * - Immediate post-AI generation
 * - Media picker UI (on-demand)
 *
 * Deterministic, safe, and platform-aware.
 */
export function suggestMedia({
  mediaPool = [],
  content = "",
  brand = null,
  platform
}) {
  if (!platform || !PLATFORM_MEDIA_RULES[platform]) {
    return [];
  }

  if (!Array.isArray(mediaPool) || mediaPool.length === 0) {
    return [];
  }

  const rules = PLATFORM_MEDIA_RULES[platform];
  const maxItems = rules.max_items || 5;

  const scored = [];

  for (const media of mediaPool) {
    if (!media || !media.type || !rules.allowed.includes(media.type)) {
      continue;
    }

    const { score = 0, reasons = [] } = scoreMedia({
      media,
      content,
      brand,
      platform
    });

    scored.push({
      media_id: media.id,
      source: media.source || "internal",
      relevance_score: Number(score.toFixed(3)),
      reasons,
      recommended_for: {
        platform,
        placement: rules.default_placement || "inline"
      },
      _tie_breaker: media.created_at || media.id
    });
  }

  return scored
    .sort((a, b) => {
      if (b.relevance_score !== a.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }
      // deterministic fallback
      return String(a._tie_breaker).localeCompare(String(b._tie_breaker));
    })
    .slice(0, maxItems)
    .map(({ _tie_breaker, ...clean }) => clean);
}
