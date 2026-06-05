/**
 * myPilotPost — Visual Context Builder
 * Pure logic. No API calls.
 *
 * Generates visual_context ONCE from brand/content inputs.
 * This is the single source of truth for what images are allowed/rejected.
 * Consumed by ranking.js — never regenerated mid-pipeline.
 *
 * Input:  { industry, title, goal, format, brandDna }
 * Output: { subjects, avoid, style, expectedCategories, industryKey }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Industry guardrails
// `reject` = image alt text must NOT contain any of these words/phrases.
// `subjects` = broad visual topics expected for this industry (for matching).
// `expectedCategories` = which image categories (human/professional/minimal/general)
//   are appropriate for this industry.
// ─────────────────────────────────────────────────────────────────────────────
const INDUSTRY_GUARDRAILS = {
  saas: {
    subjects:           ['technology', 'team', 'office', 'people', 'collaboration', 'workspace', 'software'],
    reject:             ['food', 'beauty', 'cosmetic', 'skincare', 'makeup', 'hair', 'fashion', 'clothing', 'jewelry', 'restaurant', 'cooking', 'dessert', 'baking', 'fitness equipment', 'yoga mat', 'weight', 'dumbbell'],
    style:              'clean editorial professional',
    expectedCategories: ['professional', 'human', 'minimal'],
  },
  software: {
    subjects:           ['technology', 'team', 'office', 'people', 'collaboration', 'workspace'],
    reject:             ['food', 'beauty', 'cosmetic', 'fashion', 'restaurant', 'cooking', 'fitness equipment'],
    style:              'clean professional modern',
    expectedCategories: ['professional', 'human', 'minimal'],
  },
  tech: {
    subjects:           ['technology', 'people', 'innovation', 'digital', 'office', 'team'],
    reject:             ['food', 'beauty', 'fashion', 'restaurant', 'cosmetic', 'cooking'],
    style:              'modern professional',
    expectedCategories: ['professional', 'human', 'minimal'],
  },
  technology: {
    subjects:           ['technology', 'people', 'innovation', 'digital', 'office', 'team'],
    reject:             ['food', 'beauty', 'fashion', 'restaurant', 'cosmetic', 'cooking'],
    style:              'modern professional',
    expectedCategories: ['professional', 'human', 'minimal'],
  },
  'real estate': {
    subjects:           ['property', 'home', 'architecture', 'interior', 'building', 'house'],
    reject:             ['beauty', 'fashion', 'cosmetic', 'electronics', 'fitness equipment', 'restaurant kitchen staff'],
    style:              'clean architectural',
    expectedCategories: ['professional', 'general', 'minimal'],
  },
  restaurant: {
    subjects:           ['food', 'restaurant', 'dining', 'people', 'cuisine', 'chef'],
    reject:             ['office', 'corporate meeting', 'fashion runway', 'beauty cosmetic', 'gym equipment', 'technology dashboard'],
    style:              'warm authentic',
    expectedCategories: ['human', 'general'],
  },
  food: {
    subjects:           ['food', 'cuisine', 'cooking', 'people', 'meal'],
    reject:             ['office', 'corporate', 'fashion', 'beauty cosmetic', 'gym', 'technology laptop'],
    style:              'warm authentic lifestyle',
    expectedCategories: ['human', 'general'],
  },
  coffee: {
    subjects:           ['coffee', 'cafe', 'lifestyle', 'people', 'cup'],
    reject:             ['corporate boardroom', 'fashion runway', 'beauty cosmetic', 'gym equipment', 'fitness'],
    style:              'warm authentic lifestyle',
    expectedCategories: ['human', 'general'],
  },
  cafe: {
    subjects:           ['coffee', 'cafe', 'lifestyle', 'people', 'cup'],
    reject:             ['corporate boardroom', 'fashion runway', 'beauty cosmetic', 'gym equipment'],
    style:              'warm authentic',
    expectedCategories: ['human', 'general'],
  },
  fitness: {
    subjects:           ['fitness', 'sport', 'workout', 'people', 'health', 'active'],
    reject:             ['food styling', 'fashion runway', 'beauty cosmetic', 'corporate office', 'technology dashboard'],
    style:              'dynamic authentic',
    expectedCategories: ['human'],
  },
  healthcare: {
    subjects:           ['health', 'medical', 'wellness', 'people', 'care', 'clean'],
    reject:             ['fashion', 'beauty cosmetic', 'food styling', 'corporate', 'technology'],
    style:              'clean professional',
    expectedCategories: ['professional', 'human', 'minimal'],
  },
  finance: {
    subjects:           ['professional', 'business', 'office', 'people', 'success', 'meeting'],
    reject:             ['food', 'beauty', 'fashion', 'fitness equipment', 'restaurant', 'cosmetic'],
    style:              'professional clean',
    expectedCategories: ['professional', 'human'],
  },
  fashion: {
    subjects:           ['fashion', 'clothing', 'style', 'model', 'people', 'lifestyle'],
    reject:             ['office', 'technology', 'food', 'medical', 'gym equipment'],
    style:              'lifestyle editorial',
    expectedCategories: ['human', 'general'],
  },
  beauty: {
    subjects:           ['beauty', 'skincare', 'woman', 'lifestyle', 'portrait', 'face'],
    reject:             ['office', 'technology', 'food', 'fitness equipment', 'corporate boardroom'],
    style:              'warm lifestyle portrait',
    expectedCategories: ['human', 'minimal'],
  },
  marketing: {
    subjects:           ['team', 'collaboration', 'creative', 'people', 'office'],
    reject:             ['food', 'beauty', 'fashion', 'fitness equipment', 'cosmetic'],
    style:              'creative professional',
    expectedCategories: ['professional', 'human'],
  },
  consulting: {
    subjects:           ['professional', 'business', 'meeting', 'people', 'office', 'executive'],
    reject:             ['food', 'beauty', 'fashion', 'fitness', 'cosmetic'],
    style:              'professional clean',
    expectedCategories: ['professional', 'human'],
  },
  education: {
    subjects:           ['learning', 'education', 'people', 'professional', 'students', 'knowledge'],
    reject:             ['food', 'beauty', 'fashion', 'cosmetic', 'fitness equipment'],
    style:              'clean professional',
    expectedCategories: ['professional', 'human', 'minimal'],
  },
  retail: {
    subjects:           ['product', 'shopping', 'lifestyle', 'people', 'store'],
    reject:             ['office corporate', 'medical', 'gym', 'technology dashboard'],
    style:              'lifestyle product',
    expectedCategories: ['human', 'general'],
  },
  travel: {
    subjects:           ['travel', 'destination', 'landscape', 'people', 'adventure', 'outdoor'],
    reject:             ['office', 'corporate', 'beauty cosmetic', 'fashion runway', 'fitness equipment'],
    style:              'authentic adventure',
    expectedCategories: ['human', 'general'],
  },
  agency: {
    subjects:           ['creative', 'team', 'collaboration', 'office', 'people', 'design'],
    reject:             ['food', 'beauty', 'fashion', 'fitness', 'cosmetic', 'restaurant'],
    style:              'creative professional',
    expectedCategories: ['professional', 'human'],
  },
};

// Words in image alt text that indicate it's off-brand for almost any professional brand
const UNIVERSAL_REJECT = ['meme', 'screenshot', 'clip art', 'watermark', 'cartoon', 'clipart'];

/**
 * Resolve the industry guardrail for a given industry string.
 * Returns null if no match found (caller applies a permissive default).
 */
function resolveGuardrail(industry) {
  if (!industry) return null;
  const lower = industry.toLowerCase();
  for (const [key, rules] of Object.entries(INDUSTRY_GUARDRAILS)) {
    if (lower.includes(key)) return { ...rules, industryKey: key };
  }
  return null;
}

/**
 * Build visual_context from brand/content inputs.
 *
 * @param {{
 *   industry?: string,   -- from brand or content
 *   title?:    string,   -- content title (used to refine subjects)
 *   goal?:     string,   -- content goal
 *   format?:   string,   -- content format
 *   brandDna?: {         -- from brand_dna_profiles + brand_dna_visual_identity
 *     industry?:          string,
 *     positioning?:       string,
 *     imagery_style?:     string,
 *     visual_direction?:  string,
 *   }
 * }} input
 *
 * @returns {{
 *   subjects:           string[],
 *   avoid:              string[],
 *   style:              string,
 *   expectedCategories: string[],
 *   industryKey:        string,
 * }}
 */
export function buildVisualContext({ industry = '', title = '', goal = '', format = 'social', brandDna = null } = {}) {
  // Brand DNA may provide a more specific industry
  const effectiveIndustry = (brandDna?.industry || industry || '').toLowerCase();

  const guardrail = resolveGuardrail(effectiveIndustry);

  // Base avoid list
  const baseReject = guardrail ? guardrail.reject : [];
  const avoid = [...new Set([...baseReject, ...UNIVERSAL_REJECT])];

  // Base subjects from guardrail
  let subjects = guardrail ? [...guardrail.subjects] : ['people', 'professional', 'lifestyle'];

  // Brand DNA visual injection (Step 5)
  let dnaStyle = '';
  if (brandDna) {
    // imagery_style from brand_dna_visual_identity
    if (brandDna.imagery_style) {
      dnaStyle = brandDna.imagery_style.toLowerCase().replace(/[^a-z\s]/g, '');
    }
    // visual_direction may contain subject hints (e.g., "people-first, minimal backgrounds")
    if (brandDna.visual_direction) {
      const directionWords = brandDna.visual_direction
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !['with', 'and', 'for', 'the', 'our'].includes(w));
      subjects = [...new Set([...subjects, ...directionWords.slice(0, 3)])];
    }
  }

  const baseStyle = guardrail ? guardrail.style : 'professional authentic';
  const styleWords = [...new Set([...baseStyle.split(' '), ...dnaStyle.split(' ').filter(Boolean)])];

  return {
    subjects:           subjects.slice(0, 8),
    avoid,
    style:              styleWords.join(' '),
    expectedCategories: guardrail ? guardrail.expectedCategories : ['human', 'professional', 'minimal', 'general'],
    industryKey:        guardrail?.industryKey || effectiveIndustry || 'general',
  };
}

/**
 * Compute title↔image match score (0–100).
 *
 * Scoring model:
 *   60 pts — image passes industry guardrail (no reject terms in alt)
 *   20 pts — at least one visual subject appears in image alt text
 *   20 pts — image category is in expectedCategories
 *
 * Threshold: 80. Images below 80 are discarded.
 * Images score 80 when they pass the guardrail AND hit at least one of:
 *   subject match OR correct category.
 */
export function computeMatchScore(img, visualContext) {
  if (!visualContext) return 100; // no context → neutral pass

  const alt    = (img.alt || '').toLowerCase();
  const cat    = img.category || 'general';
  const avoid  = visualContext.avoid || [];

  // Guardrail check: any reject phrase found → immediate discard
  const rejected = avoid.some(phrase => {
    const words = phrase.toLowerCase().split(/\s+/);
    // All words of the phrase must appear in alt (phrase matching)
    return words.length > 1
      ? words.every(w => alt.includes(w))
      : alt.includes(words[0]);
  });
  if (rejected) return 0;

  let score = 60; // Passed guardrail baseline

  // Subject match
  const subjects = visualContext.subjects || [];
  if (subjects.some(s => alt.includes(s.toLowerCase()))) score += 20;

  // Category alignment
  const expectedCats = visualContext.expectedCategories || [];
  if (expectedCats.includes(cat))    score += 20;
  else if (cat === 'general')        score += 10; // general is acceptable fallback

  return score; // possible values: 0, 60, 70, 80, 90, 100
}

export const MATCH_THRESHOLD = 80;
