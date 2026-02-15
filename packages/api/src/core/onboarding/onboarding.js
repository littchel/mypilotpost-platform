// packages/api/src/core/onboarding/onboarding.js
// myPilotPost — Onboarding Backend v1 (AUTHORITATIVE)

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { nanoid } from "nanoid";
import { markOnboardingStep } from "./progress.js";

/*
  POST /api/customer/onboarding/brand
  Creates a new brand and starts onboarding
*/
export async function createBrandOnboarding(request, env, auth) {
  const db = getDB(env);
  const body = await request.json();

  const {
    name,
    industry,
    region,
    website_url,
    business_type
  } = body;

  if (!name || !industry || !region || !business_type) {
    return json({ error: "Missing required onboarding fields" }, 400);
  }

  const brand_id = nanoid();

  await db
    .prepare(`
      INSERT INTO brands (
        id,
        owner_id,
        name,
        industry,
        region,
        website_url,
        business_type,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
    .bind(
      brand_id,
      auth.user_id,
      name,
      industry,
      region,
      website_url || null,
      business_type
    )
    .run();

  /* Brand creation memory event */
  await db
    .prepare(`
      INSERT INTO brand_memory_events (
        id,
        brand_id,
        type,
        source,
        confidence,
        created_at
      ) VALUES (?, ?, 'brand.created', 'onboarding', 1.0, datetime('now'))
    `)
    .bind(nanoid(), brand_id)
    .run();

  /* Onboarding progress */
  await markOnboardingStep(env, brand_id, "brand_identity");
  await markOnboardingStep(env, brand_id, "business_type");

  return json({ brand_id });
}

/*
  PATCH /api/customer/onboarding/brand/:id
  Updates brand onboarding fields step-by-step
*/
export async function updateBrandOnboarding(request, env, auth, brand_id) {
  const db = getDB(env);
  const updates = await request.json();

  const allowed = [
    "industry",
    "region",
    "website_url",
    "business_type",
    "goals",
    "audience_profile"
  ];

  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  if (!fields.length) {
    return json({ error: "No valid onboarding fields" }, 400);
  }

  const sets = fields.map(f => `${f} = ?`).join(", ");
  const values = fields.map(f => updates[f]);

  const result = await db
    .prepare(`
      UPDATE brands
      SET ${sets}
      WHERE id = ? AND owner_id = ?
    `)
    .bind(...values, brand_id, auth.user_id)
    .run();

  if (!result.success) {
    return json({ error: "Brand update failed" }, 400);
  }

  /* Brand update memory event */
  await db
    .prepare(`
      INSERT INTO brand_memory_events (
        id,
        brand_id,
        type,
        source,
        confidence,
        metadata,
        created_at
      ) VALUES (?, ?, 'brand.updated', 'onboarding', 0.9, ?, datetime('now'))
    `)
    .bind(
      nanoid(),
      brand_id,
      JSON.stringify({ updated_fields: fields })
    )
    .run();

  /* Progress inference */
  if (fields.includes("goals")) {
    await markOnboardingStep(env, brand_id, "goals");
  }

  if (fields.includes("audience_profile")) {
    await markOnboardingStep(env, brand_id, "audience");
  }

  return json({ success: true });
}

/*
  GET /api/customer/onboarding/status
  Returns onboarding progress for current brand
*/
export async function getOnboardingStatus(request, env, auth) {
  const db = getDB(env);

  const progress = await db
    .prepare(`
      SELECT *
      FROM onboarding_progress
      WHERE brand_id = ?
    `)
    .bind(auth.brand_id)
    .first();

  return json({ onboarding: progress || null });
}
