/**
 * myPilotPost — Brand DNA Engine
 * STRATEGIC GROUNDING • CANON LOCK
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/customer/brand-dna
 */
export async function getBrandDNA(request, env, auth) {
  const brandId = request.headers.get("x-brand-id") || auth.brand_id;
  if (!brandId) return error("Brand context required", "MISSING_BRAND", null, 400);

  const db = getDB(env);

  const [profile, audience, voice, visual, objectives, pillars, competitors, bizIntel] = await Promise.all([
    db.prepare("SELECT * FROM brand_dna_profiles WHERE brand_id = ?").bind(brandId).first(),
    db.prepare("SELECT * FROM brand_dna_audience WHERE brand_id = ?").bind(brandId).first(),
    db.prepare("SELECT * FROM brand_dna_voice WHERE brand_id = ?").bind(brandId).first(),
    db.prepare("SELECT * FROM brand_dna_visual_identity WHERE brand_id = ?").bind(brandId).first(),
    db.prepare("SELECT * FROM brand_dna_objectives WHERE brand_id = ?").bind(brandId).first(),
    db.prepare("SELECT * FROM brand_dna_content_pillars WHERE brand_id = ?").bind(brandId).all(),
    db.prepare("SELECT * FROM brand_dna_competitors WHERE brand_id = ?").bind(brandId).all(),
    db.prepare("SELECT * FROM brand_business_intelligence WHERE brand_id = ?").bind(brandId).first()
  ]);

  if (!profile) return migrateLegacyBrand(db, brandId);

  return json({
    profile: parseJSONFields(profile, ['brand_personality', 'differentiators']),
    audience: parseJSONFields(audience, ['demographics', 'psychographics', 'pain_points', 'desires', 'objections']),
    voice: parseJSONFields(voice, ['voice_traits', 'forbidden_language']),
    visual: visual || {},
    objectives: objectives || {},
    business_intelligence: bizIntel || {},
    content_pillars: (pillars?.results || []).map(p => parseJSONFields(p, ['preferred_formats'])),
    competitors: (competitors?.results || []).map(c => parseJSONFields(c, ['strengths', 'weaknesses'])),
    completeness: calculateDNACompleteness({ profile, audience, voice, visual, objectives, bizIntel })
  });
}

/**
 * Hydrates Brand DNA from a public audit result
 */
export async function hydrateAuditIntoDNA(db, brandId, auditId) {
  const audit = await db.prepare("SELECT * FROM brand_audit_results_v2 WHERE id = ?").bind(auditId).first();
  if (!audit) return;

  const breakdown = JSON.parse(audit.score_breakdown_json || '{}');
  const insights = JSON.parse(audit.strategic_actions_json || '[]');

  // 1. Hydrate Profile
  await db.prepare(`
    INSERT INTO brand_dna_profiles (brand_id, brand_name, industry, value_proposition, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id) DO UPDATE SET updated_at = datetime('now')
  `).bind(brandId, audit.brand_name, audit.industry || 'General', audit.brand_name).run();

  // 2. Hydrate Objectives based on gaps
  await db.prepare(`
    INSERT INTO brand_dna_objectives (brand_id, awareness_goal, authority_goal, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id) DO UPDATE SET updated_at = datetime('now')
  `).bind(
    brandId, 
    breakdown.consistency < 50 ? "Improve posting consistency" : "Maintain growth",
    breakdown.platform_coverage < 50 ? "Expand platform footprint" : "Dominant authority"
  ).run();

  // 3. Hydrate Content Pillars from insights
  for (const insight of insights.slice(0, 3)) {
    await db.prepare(`
      INSERT INTO brand_dna_content_pillars (id, brand_id, title, description)
      VALUES (?, ?, ?, ?)
    `).bind(crypto.randomUUID(), brandId, insight.metric, insight.recommendation).run();
  }
}

/**
 * POST/PATCH /api/customer/brand-dna
 */
export async function updateBrandDNA(request, env, auth) {
  const brandId = request.headers.get("x-brand-id") || auth.brand_id;
  if (!brandId) return error("Brand context required", "MISSING_BRAND", null, 400);

  const db = getDB(env);
  const body = await request.json();
  const { profile, audience, voice, visual, objectives, business_intelligence, content_pillars, competitors } = body;

  const batches = [];

  if (profile) {
    batches.push(db.prepare(`
      INSERT INTO brand_dna_profiles (brand_id, brand_name, industry, value_proposition, brand_personality, differentiators, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(brand_id) DO UPDATE SET
        brand_name = COALESCE(?, brand_name),
        industry = COALESCE(?, industry),
        value_proposition = COALESCE(?, value_proposition),
        brand_personality = COALESCE(?, brand_personality),
        differentiators = COALESCE(?, differentiators),
        updated_at = datetime('now')
    `).bind(
      brandId, profile.brand_name, profile.industry, profile.value_proposition, JSON.stringify(profile.brand_personality), JSON.stringify(profile.differentiators),
      profile.brand_name, profile.industry, profile.value_proposition, JSON.stringify(profile.brand_personality), JSON.stringify(profile.differentiators)
    ));
  }

  if (audience) {
    batches.push(db.prepare(`
      INSERT INTO brand_dna_audience (brand_id, demographics, psychographics, pain_points, desires, objections, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(brand_id) DO UPDATE SET
        demographics = COALESCE(?, demographics),
        psychographics = COALESCE(?, psychographics),
        pain_points = COALESCE(?, pain_points),
        desires = COALESCE(?, desires),
        objections = COALESCE(?, objections),
        updated_at = datetime('now')
    `).bind(
      brandId, JSON.stringify(audience.demographics), JSON.stringify(audience.psychographics), JSON.stringify(audience.pain_points), JSON.stringify(audience.desires), JSON.stringify(audience.objections),
      JSON.stringify(audience.demographics), JSON.stringify(audience.psychographics), JSON.stringify(audience.pain_points), JSON.stringify(audience.desires), JSON.stringify(audience.objections)
    ));
  }

  if (voice) {
    batches.push(db.prepare(`
      INSERT INTO brand_dna_voice (brand_id, voice_traits, forbidden_language, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(brand_id) DO UPDATE SET
        voice_traits = COALESCE(?, voice_traits),
        forbidden_language = COALESCE(?, forbidden_language),
        updated_at = datetime('now')
    `).bind(
      brandId, JSON.stringify(voice.voice_traits), JSON.stringify(voice.forbidden_language),
      JSON.stringify(voice.voice_traits), JSON.stringify(voice.forbidden_language)
    ));
  }

  // Handle batch execution
  if (batches.length > 0) {
    await db.batch(batches);
  }

  return json({ success: true, message: "Brand DNA updated" });
}

function calculateDNACompleteness(data) {
  const sections = [
    data.profile ? 1 : 0,
    data.audience ? 1 : 0,
    data.voice ? 1 : 0,
    data.visual ? 1 : 0,
    data.objectives ? 1 : 0,
    data.bizIntel ? 1 : 0
  ];
  const score = (sections.reduce((a, b) => a + b, 0) / sections.length) * 100;
  return Math.round(score);
}

async function migrateLegacyBrand(db, brandId) {
  const brand = await db.prepare("SELECT * FROM brands WHERE id = ?").bind(brandId).first();
  if (!brand) return error("Brand not found", "NOT_FOUND", null, 404);

  await db.prepare(`
    INSERT INTO brand_dna_profiles (brand_id, industry, brand_personality, value_proposition)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(brand_id) DO NOTHING
  `).bind(brandId, brand.industry, JSON.stringify([brand.tone]), brand.name).run();

  return getBrandDNA({ headers: { get: () => brandId } }, { mypilotpost: db }, { brand_id: brandId });
}

function parseJSONFields(obj, fields) {
  if (!obj) return {};
  const newObj = { ...obj };
  fields.forEach(f => {
    if (newObj[f]) {
      try { newObj[f] = JSON.parse(newObj[f]); } catch (e) { newObj[f] = []; }
    }
  });
  return newObj;
}
