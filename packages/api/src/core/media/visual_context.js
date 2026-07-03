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
const TECH_KEYS = new Set([
  "aerospace and defense", "ai and machine learning", "aviation and aerospace", "biotechnology", 
  "computer hardware", "computer networking", "cybersecurity", "fintech", "green tech", 
  "information technology", "it consulting", "medical devices", "saas", "saas / software", 
  "software development", "technology", "telecommunications"
]);

const WARM_KEYS = new Set([
  "alternative medicine", "baby and children products", "beverages (alcoholic)", "beverages (non-alcoholic)", 
  "chiropractic care", "coworking and shared spaces", "dental", "events", "food", "food and beverage", 
  "food and beverage production", "grocery and supermarkets", "healthcare", "hospitality", "hotels", 
  "mental health and counseling", "optometry and eye care", "organic and natural products", 
  "pet products and services", "restaurants", "travel", "travel and hospitality", "veterinary services"
]);

const MINIMAL_KEYS = new Set([
  "accounting", "architecture and design", "banking", "book publishing", "business supplies and equipment", 
  "chemical industry", "commercial printing", "consulting", "design services", "education", 
  "executive search", "facility management", "finance", "financial advisory", "general business", 
  "human resources", "insurance", "investment banking", "legal", "management consulting", 
  "professional services", "property management", "public relations", "real estate development", 
  "recruitment", "venture capital and private equity", "wholesale", "writing and editing"
]);

const ORGANIC_KEYS = new Set([
  "agriculture", "clean energy and solar", "construction", "energy and utilities", "environmental services", 
  "general contracting", "landscaping and gardening", "moving and storage", "moving services", 
  "pest control", "renewables and environment", "renewable energy", "yoga and mindfulness"
]);

const BOLD_KEYS = new Set([
  "arts and crafts", "automotive", "beauty", "consumer electronics", "cosmetics and personal care", 
  "digital media", "e-commerce", "ecommerce", "fashion", "fine art and galleries", "fitness", 
  "fitness and wellness", "furniture and home decor", "gaming and esports", "graphic design", 
  "hardware and tools", "interior design", "jewelry and luxury goods", "luxury goods and jewelry", 
  "logistics and supply chain", "manufacturing", "marine and shipping", "marketing agency", 
  "media and entertainment", "mining and metals", "music and audio production", "nonprofit", 
  "packaging and containers", "pharmaceuticals", "photography and videography", "real estate", 
  "retail", "retail / fashion", "sports and recreation", "transportation and warehousing", 
  "waste management"
]);

export function getIndustryVisualProfile(industryName) {
  const input = String(industryName || "").toLowerCase().trim();
  const normalized = input.replace(/\s*&\s*/g, ' and ').replace(/\s+/g, ' ');

  if (TECH_KEYS.has(normalized)) {
    return {
      preferred_terms: ["technology", "digital", "workspace", "device", "office", "code", "server", "innovation", "clean"],
      blocked_terms: ["makeup", "skincare", "cosmetics", "food styling", "cooking", "fitness equipment", "fashion runway"],
      visual_style: "tech"
    };
  }
  if (WARM_KEYS.has(normalized)) {
    return {
      preferred_terms: ["people", "lifestyle", "warmth", "authentic", "natural", "cuisine", "interior", "dining", "candid"],
      blocked_terms: ["boardroom", "corporate meeting", "server room", "cleanroom", "circuit board", "industrial manufacturing"],
      visual_style: "warm"
    };
  }
  if (MINIMAL_KEYS.has(normalized)) {
    return {
      preferred_terms: ["minimal", "clean", "negative space", "modern", "professional", "office", "workspace", "documents", "focused"],
      blocked_terms: ["makeup", "skincare", "food styling", "heavy machinery", "construction site", "messy"],
      visual_style: "minimal"
    };
  }
  if (ORGANIC_KEYS.has(normalized)) {
    return {
      preferred_terms: ["natural", "green", "outdoor", "plant", "organic", "sunlight", "sustainability", "mindful", "nature"],
      blocked_terms: ["boardroom", "corporate boardroom", "server racks", "makeup", "cosmetics", "high fashion"],
      visual_style: "organic"
    };
  }
  if (BOLD_KEYS.has(normalized)) {
    return {
      preferred_terms: ["style", "bold", "contrast", "color", "model", "artistic", "creative", "action", "lifestyle"],
      blocked_terms: ["office corporate", "medical clinic", "staged office", "boring"],
      visual_style: "bold"
    };
  }

  // Substring fallback matching
  for (const key of TECH_KEYS) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        preferred_terms: ["technology", "digital", "workspace", "device", "office", "code", "server", "innovation", "clean"],
        blocked_terms: ["makeup", "skincare", "cosmetics", "food styling", "cooking", "fitness equipment", "fashion runway"],
        visual_style: "tech"
      };
    }
  }
  for (const key of WARM_KEYS) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        preferred_terms: ["people", "lifestyle", "warmth", "authentic", "natural", "cuisine", "interior", "dining", "candid"],
        blocked_terms: ["boardroom", "corporate meeting", "server room", "cleanroom", "circuit board", "industrial manufacturing"],
        visual_style: "warm"
      };
    }
  }
  for (const key of MINIMAL_KEYS) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        preferred_terms: ["minimal", "clean", "negative space", "modern", "professional", "office", "workspace", "documents", "focused"],
        blocked_terms: ["makeup", "skincare", "food styling", "heavy machinery", "construction site", "messy"],
        visual_style: "minimal"
      };
    }
  }
  for (const key of ORGANIC_KEYS) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        preferred_terms: ["natural", "green", "outdoor", "plant", "organic", "sunlight", "sustainability", "mindful", "nature"],
        blocked_terms: ["boardroom", "corporate boardroom", "server racks", "makeup", "cosmetics", "high fashion"],
        visual_style: "organic"
      };
    }
  }
  for (const key of BOLD_KEYS) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        preferred_terms: ["style", "bold", "contrast", "color", "model", "artistic", "creative", "action", "lifestyle"],
        blocked_terms: ["office corporate", "medical clinic", "staged office", "boring"],
        visual_style: "bold"
      };
    }
  }

  return {
    preferred_terms: ["professional", "clean", "authentic", "lifestyle"],
    blocked_terms: ["watermark", "staged photo", "screenshot", "meme"],
    visual_style: "minimal"
  };
}

export function applyIndustryGuardrails(imageAlt, industry) {
  const profile = getIndustryVisualProfile(industry);
  const alt = (imageAlt || "").toLowerCase();

  const isBlocked = profile.blocked_terms.some(phrase => {
    const words = phrase.toLowerCase().split(/\s+/);
    return words.length > 1
      ? words.every(w => alt.includes(w))
      : alt.includes(phrase.toLowerCase());
  });

  if (isBlocked) {
    return { approved: false, score: 0 };
  }

  let scoreBoost = 0;
  profile.preferred_terms.forEach(term => {
    if (alt.includes(term.toLowerCase())) {
      scoreBoost += 10;
    }
  });

  return { approved: true, score: scoreBoost };
}

// Words in image alt text that indicate it's off-brand for almost any professional brand
const UNIVERSAL_REJECT = ['meme', 'screenshot', 'clip art', 'watermark', 'cartoon', 'clipart'];

function resolveGuardrail(industry) {
  if (!industry) return null;
  const profile = getIndustryVisualProfile(industry);
  
  return {
    subjects: profile.preferred_terms,
    reject: profile.blocked_terms,
    style: profile.visual_style === "tech" ? "clean professional tech" 
         : profile.visual_style === "warm" ? "warm authentic lifestyle"
         : profile.visual_style === "minimal" ? "clean minimal professional"
         : profile.visual_style === "organic" ? "natural organic mindful"
         : "bold creative lifestyle",
    expectedCategories: profile.visual_style === "tech" ? ['professional', 'human', 'minimal']
                      : profile.visual_style === "warm" ? ['human', 'general']
                      : profile.visual_style === "minimal" ? ['professional', 'human', 'minimal']
                      : profile.visual_style === "organic" ? ['general', 'minimal']
                      : ['human', 'general'],
    industryKey: industry
  };
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
