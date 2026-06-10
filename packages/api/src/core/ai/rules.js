/**
 * AI OUTPUT RULES — v1
 * Platform-specific correctness & safety constraints
 * AUTHORITATIVE • DETERMINISTIC • NON-AI
 */

export const SOCIAL_RULES = {
  facebook: {
    max_chars: 63206,
    hashtags: { allowed: true, max: 5 },
    emojis: { allowed: true },
    links: { allowed: true },
    tone_blacklist: []
  },

  instagram: {
    max_chars: 2200,
    hashtags: { allowed: true, max: 15 },
    emojis: { allowed: true },
    links: { allowed: false },
    tone_blacklist: []
  },

  x: {
    max_chars: 280,
    hashtags: { allowed: true, max: 3 },
    emojis: { allowed: true },
    links: { allowed: true },
    tone_blacklist: ["long_form"]
  },

  linkedin: {
    max_chars: 3000,
    hashtags: { allowed: true, max: 5 },
    emojis: { allowed: false },
    links: { allowed: true },
    tone_blacklist: ["humorous_excess"]
  },

  tiktok: {
    max_chars: 2200,
    hashtags: { allowed: true, max: 5 },
    emojis: { allowed: true },
    links: { allowed: false },
    tone_blacklist: []
  },

  youtube: {
    max_chars: 5000,
    hashtags: { allowed: true, max: 5 },
    emojis: { allowed: true },
    links: { allowed: true },
    tone_blacklist: []
  },

  pinterest: {
    max_chars: 500,
    hashtags: { allowed: true, max: 5 },
    emojis: { allowed: true },
    links: { allowed: true },
    tone_blacklist: []
  },

  threads: {
    max_chars: 500,
    hashtags: { allowed: true, max: 5 },
    emojis: { allowed: true },
    links: { allowed: false },
    tone_blacklist: []
  }
};

export const BLOG_RULES = {
  seo: {
    title_max: 70,
    meta_description_max: 160,
    keyword_density_max: 2.5
  },
  headings: {
    require_h2: true,
    logical_order: true
  },
  tone_blacklist: ["salesy", "clickbait"]
};
