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
  const brandId = auth.brand_id;
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

  if (!profile) return migrateLegacyBrand(db, env, brandId);

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
  const fullReport = JSON.parse(audit.full_report_json || '{}');
  const primaryOffer = fullReport?.business_profile?.primary_offer || null;

  // 1. Hydrate Profile — use primary_offer for value_proposition if available
  await db.prepare(`
    INSERT INTO brand_dna_profiles (brand_id, industry, value_proposition, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id) DO UPDATE SET updated_at = datetime('now')
  `).bind(brandId, audit.industry || 'General', primaryOffer || audit.brand_name).run();

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
  const brandId = auth.brand_id;
  if (!brandId) return error("Brand context required", "MISSING_BRAND", null, 400);

  const db = getDB(env);
  const body = await request.json();
  const { profile, audience, voice, visual, objectives, business_intelligence, content_pillars, competitors } = body;

  const batches = [];

  if (profile) {
    batches.push(db.prepare(`
      INSERT INTO brand_dna_profiles (brand_id, mission, vision, positioning, value_proposition, industry, brand_personality, differentiators, website_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(brand_id) DO UPDATE SET
        mission = COALESCE(?, mission),
        vision = COALESCE(?, vision),
        positioning = COALESCE(?, positioning),
        value_proposition = COALESCE(?, value_proposition),
        industry = COALESCE(?, industry),
        brand_personality = COALESCE(?, brand_personality),
        differentiators = COALESCE(?, differentiators),
        website_url = COALESCE(?, website_url),
        updated_at = datetime('now')
    `).bind(
      brandId,
      profile.mission || null, profile.vision || null, profile.positioning || null,
      profile.value_proposition || null, profile.industry || null,
      JSON.stringify(profile.brand_personality || []), JSON.stringify(profile.differentiators || []),
      profile.website_url || null,
      profile.mission || null, profile.vision || null, profile.positioning || null,
      profile.value_proposition || null, profile.industry || null,
      JSON.stringify(profile.brand_personality || []), JSON.stringify(profile.differentiators || []),
      profile.website_url || null
    ));
  }

  if (audience) {
    batches.push(db.prepare(`
      INSERT INTO brand_dna_audience (brand_id, icp_name, demographics, psychographics, pain_points, desires, objections, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(brand_id) DO UPDATE SET
        icp_name = COALESCE(?, icp_name),
        demographics = COALESCE(?, demographics),
        psychographics = COALESCE(?, psychographics),
        pain_points = COALESCE(?, pain_points),
        desires = COALESCE(?, desires),
        objections = COALESCE(?, objections),
        updated_at = datetime('now')
    `).bind(
      brandId,
      audience.icp_name || null,
      JSON.stringify(audience.demographics || {}), JSON.stringify(audience.psychographics || {}),
      JSON.stringify(audience.pain_points || []), JSON.stringify(audience.desires || []), JSON.stringify(audience.objections || []),
      audience.icp_name || null,
      JSON.stringify(audience.demographics || {}), JSON.stringify(audience.psychographics || {}),
      JSON.stringify(audience.pain_points || []), JSON.stringify(audience.desires || []), JSON.stringify(audience.objections || [])
    ));
  }

  if (voice) {
    batches.push(db.prepare(`
      INSERT INTO brand_dna_voice (brand_id, voice_traits, forbidden_language, cta_style, messaging_style, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(brand_id) DO UPDATE SET
        voice_traits = COALESCE(?, voice_traits),
        forbidden_language = COALESCE(?, forbidden_language),
        cta_style = COALESCE(?, cta_style),
        messaging_style = COALESCE(?, messaging_style),
        updated_at = datetime('now')
    `).bind(
      brandId,
      JSON.stringify(voice.voice_traits || []), JSON.stringify(voice.forbidden_language || []),
      voice.cta_style || null, voice.messaging_style || null,
      JSON.stringify(voice.voice_traits || []), JSON.stringify(voice.forbidden_language || []),
      voice.cta_style || null, voice.messaging_style || null
    ));
  }

  if (visual) {
    batches.push(db.prepare(`
      INSERT INTO brand_dna_visual_identity (
        brand_id, primary_color, secondary_color, typography_main, visual_direction, imagery_style,
        primary_color_hex, secondary_color_hex, font_pairing_headline, font_pairing_body, 
        logo_asset_url, visual_style, watermark_position, background_preference, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(brand_id) DO UPDATE SET
        primary_color = COALESCE(?, primary_color),
        secondary_color = COALESCE(?, secondary_color),
        typography_main = COALESCE(?, typography_main),
        visual_direction = COALESCE(?, visual_direction),
        imagery_style = COALESCE(?, imagery_style),
        primary_color_hex = COALESCE(?, primary_color_hex),
        secondary_color_hex = COALESCE(?, secondary_color_hex),
        font_pairing_headline = COALESCE(?, font_pairing_headline),
        font_pairing_body = COALESCE(?, font_pairing_body),
        logo_asset_url = COALESCE(?, logo_asset_url),
        visual_style = COALESCE(?, visual_style),
        watermark_position = COALESCE(?, watermark_position),
        background_preference = COALESCE(?, background_preference),
        updated_at = datetime('now')
    `).bind(
      brandId,
      visual.primary_color || null, visual.secondary_color || null,
      visual.typography_main || null, visual.visual_direction || null, visual.imagery_style || null,
      visual.primary_color_hex || null, visual.secondary_color_hex || null,
      visual.font_pairing_headline || null, visual.font_pairing_body || null,
      visual.logo_asset_url || null, visual.visual_style || null,
      visual.watermark_position || null, visual.background_preference || null,
      visual.primary_color || null, visual.secondary_color || null,
      visual.typography_main || null, visual.visual_direction || null, visual.imagery_style || null,
      visual.primary_color_hex || null, visual.secondary_color_hex || null,
      visual.font_pairing_headline || null, visual.font_pairing_body || null,
      visual.logo_asset_url || null, visual.visual_style || null,
      visual.watermark_position || null, visual.background_preference || null
    ));
  }

  if (objectives) {
    batches.push(db.prepare(`
      INSERT INTO brand_dna_objectives (brand_id, awareness_goal, leads_goal, conversions_goal, retention_goal, seo_goal, authority_goal, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(brand_id) DO UPDATE SET
        awareness_goal = COALESCE(?, awareness_goal),
        leads_goal = COALESCE(?, leads_goal),
        conversions_goal = COALESCE(?, conversions_goal),
        retention_goal = COALESCE(?, retention_goal),
        seo_goal = COALESCE(?, seo_goal),
        authority_goal = COALESCE(?, authority_goal),
        updated_at = datetime('now')
    `).bind(
      brandId,
      objectives.awareness_goal || null, objectives.leads_goal || null,
      objectives.conversions_goal || null, objectives.retention_goal || null,
      objectives.seo_goal || null, objectives.authority_goal || null,
      objectives.awareness_goal || null, objectives.leads_goal || null,
      objectives.conversions_goal || null, objectives.retention_goal || null,
      objectives.seo_goal || null, objectives.authority_goal || null
    ));
  }

  if (batches.length > 0) {
    await db.batch(batches);
  }

  if (content_pillars && Array.isArray(content_pillars)) {
    await db.prepare("DELETE FROM brand_dna_content_pillars WHERE brand_id = ?").bind(brandId).run();
    for (const pillar of content_pillars) {
      if (!pillar.title?.trim()) continue;
      await db.prepare(
        "INSERT INTO brand_dna_content_pillars (id, brand_id, title, description, preferred_formats) VALUES (?, ?, ?, ?, ?)"
      ).bind(
        pillar.id || crypto.randomUUID(), brandId,
        pillar.title, pillar.description || '',
        JSON.stringify(pillar.preferred_formats || [])
      ).run();
    }
  }

  if (competitors && Array.isArray(competitors)) {
    await db.prepare("DELETE FROM brand_dna_competitors WHERE brand_id = ?").bind(brandId).run();
    for (const c of competitors) {
      if (!c.name?.trim()) continue;
      await db.prepare(
        "INSERT INTO brand_dna_competitors (id, brand_id, name, strengths, weaknesses, strategy_notes) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(
        crypto.randomUUID(), brandId, c.name,
        JSON.stringify(c.strengths || []), JSON.stringify(c.weaknesses || []),
        c.strategy_notes || ''
      ).run();
    }
  }

  // Invalidate any visual DNA or context caches
  if (env.KV_NAMESPACE || env.REDIS) {
    try {
      const cacheKey = `brand_context:${brandId}`;
      if (env.KV_NAMESPACE) await env.KV_NAMESPACE.delete(cacheKey);
      if (env.REDIS) await env.REDIS.del(cacheKey);
    } catch {}
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

async function migrateLegacyBrand(db, env, brandId) {
  const brand = await db.prepare("SELECT * FROM brands WHERE id = ?").bind(brandId).first();
  if (!brand) return error("Brand not found", "NOT_FOUND", null, 404);

  // 1. Fetch onboarding progress for the owner
  let onboardingData = null;
  const progress = await db.prepare("SELECT data FROM onboarding_progress WHERE user_id = ?").bind(brand.owner_user_id).first().catch(() => null);
  if (progress?.data) {
    try {
      onboardingData = JSON.parse(progress.data);
    } catch (e) {}
  }

  // 2. Initialize Brand DNA structure
  let dna = null;

  const name = brand.name;
  const industry = brand.industry || "General";
  const tone = brand.tone || "professional";
  const description = onboardingData?.description || "";
  const goals = onboardingData?.goals || [];
  const auditReport = onboardingData?.audit?.full_report || null;

  try {
    const apiKey = env.GROQ_API_KEY;
    if (apiKey) {
      const systemPrompt = "You are a world-class strategic brand consultant. Generate a complete and highly specific Brand DNA matching the exact schema in strict JSON.";
      const userPrompt = `
Generate a Brand DNA for:
Name: ${name}
Industry: ${industry}
Tone: ${tone}
Description: ${description}
Goals: ${JSON.stringify(goals)}
Audit signals: ${auditReport ? JSON.stringify(auditReport) : "None available"}

Return a single JSON object with this exact structure:
{
  "profile": {
    "mission": "string",
    "vision": "string",
    "positioning": "string",
    "value_proposition": "string",
    "brand_personality": ["string", "string", "string"],
    "differentiators": ["string", "string"]
  },
  "audience": {
    "demographics": {
      "age_range": "string",
      "occupations": ["string"],
      "income_level": "string",
      "locations": ["string"]
    },
    "psychographics": {
      "values": ["string"],
      "interests": ["string"],
      "lifestyle": "string"
    },
    "pain_points": ["string"],
    "desires": ["string"],
    "objections": ["string"]
  },
  "voice": {
    "voice_traits": ["string"],
    "forbidden_language": ["string"]
  },
  "visual": {
    "primary_color": "hex",
    "secondary_color": "hex",
    "accent_color": "hex",
    "font_headings": "string",
    "font_body": "string",
    "style_notes": "string"
  },
  "objectives": {
    "awareness_goal": "string",
    "authority_goal": "string",
    "conversion_goal": "string",
    "growth_goal": "string"
  },
  "content_pillars": [
    {"title": "string", "description": "string"}
  ],
  "competitors": [
    {"name": "string", "strengths": ["string"], "weaknesses": ["string"], "strategy_notes": "string"}
  ]
}

Return ONLY the JSON. No explanations, no markdown wrapper.`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 1500,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const groqJson = await response.json();
        const rawContent = groqJson.choices?.[0]?.message?.content;
        if (rawContent) {
          dna = JSON.parse(rawContent);
        }
      }
    }
  } catch (err) {
    console.error("[GROQ BRAND DNA GENERATION FAILED, FALLING BACK TO PROGRAMMATIC]", err);
  }

  // Safe fallback values if AI fails or is not configured
  if (!dna) {
    dna = {
      profile: {
        mission: `To empower growth in the ${industry} space through targeted distribution.`,
        vision: `To be the primary partner for ${name} audiences.`,
        positioning: `A premium provider in ${industry}.`,
        value_proposition: description || `Targeted high-quality solutions for ${industry}.`,
        brand_personality: [tone, "innovative", "dynamic"],
        differentiators: ["Focus on customer success", "Modern technology adoption"]
      },
      audience: {
        demographics: {
          age_range: "25-54",
          occupations: ["Business professionals", "Owners"],
          income_level: "Medium to high",
          locations: ["Global"]
        },
        psychographics: {
          values: ["Quality", "Innovation"],
          interests: ["Growth", "Efficiency"],
          lifestyle: "Professional, fast-paced"
        },
        pain_points: [`High competition in ${industry}`, "Managing digital reach"],
        desires: ["Enhanced market authority", "Consistent lead generation"],
        objections: ["High complexity", "Time constraints"]
      },
      voice: {
        voice_traits: [tone, "clear", "helpful"],
        forbidden_language: ["overhyped claims", "jargon"]
      },
      visual: {
        primary_color: "#2563EB",
        secondary_color: "#1E40AF",
        accent_color: "#F59E0B",
        font_headings: "Inter",
        font_body: "Roboto",
        style_notes: "Modern corporate aesthetic"
      },
      objectives: {
        awareness_goal: "Increase brand presence in the local market",
        authority_goal: "Position as a thought leader in this niche",
        conversion_goal: "Drive high-intent inquiries from landing pages",
        growth_goal: "Expand audience base by 20% quarterly"
      },
      content_pillars: [
        { title: "Topical Expertise", description: `Authoritative insights on ${industry} trends.` },
        { title: "Customer Success", description: "Sharing case studies and customer journeys." },
        { title: "Product Value", description: "Detailed showcases of our products and services." }
      ],
      competitors: [
        { name: "Direct Niche Competitor", strengths: ["Early market entry"], weaknesses: ["Legacy user interface"], strategy_notes: "Differentiate through speed and design." }
      ]
    };
  }

  const websiteUrl = onboardingData?.websiteURL || onboardingData?.url || "";

  // Batch insert DNA tables
  await db.prepare(`
    INSERT INTO brand_dna_profiles (brand_id, mission, vision, positioning, value_proposition, industry, brand_personality, differentiators, website_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id) DO UPDATE SET website_url = COALESCE(?, website_url), updated_at = datetime('now')
  `).bind(
    brandId,
    dna.profile.mission,
    dna.profile.vision,
    dna.profile.positioning,
    dna.profile.value_proposition,
    industry,
    JSON.stringify(dna.profile.brand_personality),
    JSON.stringify(dna.profile.differentiators),
    websiteUrl,
    websiteUrl
  ).run();

  await db.prepare(`
    INSERT INTO brand_dna_audience (brand_id, demographics, psychographics, pain_points, desires, objections, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id) DO UPDATE SET updated_at = datetime('now')
  `).bind(
    brandId,
    JSON.stringify(dna.audience.demographics),
    JSON.stringify(dna.audience.psychographics),
    JSON.stringify(dna.audience.pain_points),
    JSON.stringify(dna.audience.desires),
    JSON.stringify(dna.audience.objections)
  ).run();

  await db.prepare(`
    INSERT INTO brand_dna_voice (brand_id, voice_traits, forbidden_language, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id) DO UPDATE SET updated_at = datetime('now')
  `).bind(
    brandId,
    JSON.stringify(dna.voice.voice_traits),
    JSON.stringify(dna.voice.forbidden_language)
  ).run();

  await db.prepare(`
    INSERT INTO brand_dna_visual_identity (brand_id, primary_color, secondary_color, accent_color, typography_heading, typography_main, visual_direction, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id) DO UPDATE SET updated_at = datetime('now')
  `).bind(
    brandId,
    dna.visual.primary_color,
    dna.visual.secondary_color,
    dna.visual.accent_color,
    dna.visual.font_headings,
    dna.visual.font_body,
    dna.visual.style_notes
  ).run();

  await db.prepare(`
    INSERT INTO brand_dna_objectives (brand_id, awareness_goal, authority_goal, conversions_goal, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id) DO UPDATE SET updated_at = datetime('now')
  `).bind(
    brandId,
    dna.objectives.awareness_goal,
    dna.objectives.authority_goal,
    dna.objectives.conversion_goal
  ).run();

  await db.prepare("DELETE FROM brand_dna_content_pillars WHERE brand_id = ?").bind(brandId).run();
  for (const pillar of dna.content_pillars) {
    await db.prepare(`
      INSERT INTO brand_dna_content_pillars (id, brand_id, title, description)
      VALUES (?, ?, ?, ?)
    `).bind(crypto.randomUUID(), brandId, pillar.title, pillar.description).run();
  }

  await db.prepare("DELETE FROM brand_dna_competitors WHERE brand_id = ?").bind(brandId).run();
  for (const comp of dna.competitors) {
    await db.prepare(`
      INSERT INTO brand_dna_competitors (id, brand_id, name, strengths, weaknesses, strategy_notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      brandId,
      comp.name,
      JSON.stringify(comp.strengths),
      JSON.stringify(comp.weaknesses),
      comp.strategy_notes
    ).run();
  }

  return getBrandDNA({ headers: { get: () => brandId } }, env, { brand_id: brandId });
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
