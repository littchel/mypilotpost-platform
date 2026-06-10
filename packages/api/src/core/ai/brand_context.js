/**
 * Unified Brand Context Fetcher
 * Single query layer for all generation paths.
 *
 * depth:
 *   'minimal'  — brand name + industry only
 *   'standard' — + dna_profiles + voice + audience  (default)
 *   'full'     — + pillars + objectives + competitors + forbidden
 */

const GENERIC_BANNED = [
  "Most people don't know",
  "Game changer",
  "Unlock your potential",
  "Revolutionize your",
  "Take your business to the next level",
  "In today's fast-paced world",
  "Excited to share",
  "Proud to announce",
  "We're thrilled",
  "The secret is",
  "You won't believe",
  "Mind-blowing",
  "Crushing it",
  "Level up",
  "Hustle harder",
];

function parseJsonSafe(val, fallback) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function fetchBrandContext(db, brand_id, depth = 'standard') {
  const brand = await db.prepare(
    "SELECT id, name, industry, tone FROM brands WHERE id = ?"
  ).bind(brand_id).first();

  if (depth === 'minimal') {
    const context = [
      brand?.name     ? `Brand: ${brand.name}`     : null,
      brand?.industry ? `Industry: ${brand.industry}` : null,
    ].filter(Boolean).join("\n");
    return { brand, profile: null, voice: null, audience: null, pillars: [], objectives: null, competitors: [], context, forbidden: [...GENERIC_BANNED] };
  }

  const [profile, voice, audience] = await Promise.all([
    db.prepare("SELECT mission, vision, positioning, value_proposition, brand_personality, differentiators FROM brand_dna_profiles WHERE brand_id = ?").bind(brand_id).first(),
    db.prepare("SELECT voice_traits, forbidden_language, cta_style, messaging_style FROM brand_dna_voice WHERE brand_id = ?").bind(brand_id).first(),
    db.prepare("SELECT icp_name, pain_points, desires FROM brand_dna_audience WHERE brand_id = ?").bind(brand_id).first(),
  ]);

  let pillars = [], objectives = null, competitors = [];

  if (depth === 'full') {
    const [pillarRows, objRow, competitorRows] = await Promise.all([
      db.prepare("SELECT title, description FROM brand_dna_content_pillars WHERE brand_id = ? LIMIT 6").bind(brand_id).all(),
      db.prepare("SELECT awareness_goal, leads_goal, conversions_goal, authority_goal FROM brand_dna_objectives WHERE brand_id = ?").bind(brand_id).first(),
      db.prepare("SELECT name, strengths, weaknesses FROM brand_dna_competitors WHERE brand_id = ? LIMIT 3").bind(brand_id).all(),
    ]);
    pillars    = pillarRows?.results  || [];
    objectives = objRow               || null;
    competitors = competitorRows?.results || [];
  } else {
    // standard: pillars only (no objectives/competitors)
    const pillarRows = await db.prepare(
      "SELECT title FROM brand_dna_content_pillars WHERE brand_id = ? LIMIT 5"
    ).bind(brand_id).all();
    pillars = pillarRows?.results || [];
  }

  // Build the formatted context string
  const parts = [];
  if (brand?.name)                  parts.push(`Brand: ${brand.name}`);
  if (brand?.industry)              parts.push(`Industry: ${brand.industry}`);
  if (profile?.positioning)         parts.push(`Positioning: ${profile.positioning}`);
  if (profile?.value_proposition)   parts.push(`Value Proposition: ${profile.value_proposition}`);
  if (profile?.mission)             parts.push(`Mission: ${profile.mission}`);
  if (profile?.brand_personality)   parts.push(`Brand Personality: ${profile.brand_personality}`);

  if (voice?.voice_traits) {
    const traits = parseJsonSafe(voice.voice_traits, []);
    if (traits.length) parts.push(`Voice Traits: ${traits.join(", ")}`);
  }
  if (voice?.messaging_style)       parts.push(`Messaging Style: ${voice.messaging_style}`);
  if (voice?.cta_style)             parts.push(`CTA Style: ${voice.cta_style}`);

  if (audience?.icp_name)           parts.push(`Target Audience: ${audience.icp_name}`);
  if (audience?.pain_points) {
    const pains = parseJsonSafe(audience.pain_points, []);
    if (pains.length) parts.push(`Audience Pain Points: ${pains.slice(0, 3).join("; ")}`);
  }
  if (audience?.desires) {
    const desires = parseJsonSafe(audience.desires, []);
    if (desires.length) parts.push(`Audience Desires: ${desires.slice(0, 3).join("; ")}`);
  }

  if (pillars.length) {
    parts.push(`Content Pillars: ${pillars.map(p => p.title).filter(Boolean).join(", ")}`);
  }

  if (depth === 'full') {
    if (objectives?.awareness_goal)    parts.push(`Awareness Goal: ${objectives.awareness_goal}`);
    if (objectives?.authority_goal)    parts.push(`Authority Goal: ${objectives.authority_goal}`);
    if (objectives?.conversions_goal)  parts.push(`Conversions Goal: ${objectives.conversions_goal}`);
    if (competitors.length) {
      const competitorNames = competitors.map(c => c.name).join(", ");
      parts.push(`Key Competitors: ${competitorNames}`);
    }
  }

  // Forbidden phrases: brand's + generic banned list
  const brandForbidden = parseJsonSafe(voice?.forbidden_language, []);
  const forbidden = [...new Set([...brandForbidden, ...GENERIC_BANNED])];

  return { brand, profile, voice, audience, pillars, objectives, competitors, context: parts.join("\n"), forbidden };
}

/**
 * Load last N published/generated items for a brand to seed memory injection.
 * Returns an array of recent hook strings to avoid repetition.
 */
export async function loadRecentHooks(db, brand_id, limit = 5) {
  const { results } = await db.prepare(`
    SELECT output FROM ai_generations
    WHERE brand_id = ? AND content_type IN ('social','blog','studio')
      AND success = 1
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(brand_id, limit).all();

  const hooks = [];
  for (const row of (results || [])) {
    try {
      const parsed = JSON.parse(row.output || "{}");
      // Social: posts[0].hook
      if (parsed?.posts?.[0]?.hook) hooks.push(parsed.posts[0].hook);
      // Blog: title
      if (parsed?.title && !parsed?.posts) hooks.push(parsed.title);
    } catch { /* skip unparseable */ }
  }
  return hooks.slice(0, limit);
}

/**
 * Compute a stable context hash for repeat-prompt detection.
 */
export async function contextHash(brand_id, content_type, intent = '') {
  const raw = `${brand_id}|${content_type}|${intent}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 16);
}
