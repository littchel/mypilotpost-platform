// packages/api/src/core/brands/brands.js
// PRODUCTION • PHASE 2B LOCKED
// Ownership model: brands.owner_user_id (single-owner)

import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";
import { issueJWT } from "../../auth/jwt.js";
import { isValidUUID } from "../../lib/validation.js";
import { enforceLimits, recalculateUsage } from "../billing/billing.js";

/* ======================================================
   CREATE BRAND
====================================================== */
export async function createBrand(request, env, session) {
  if (!session?.user_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", "INVALID_JSON", null, 400);
  }

  const { name, industry, tone, goals } = body || {};

  if (!name || !name.trim()) return error("Brand name is required", "BAD_REQUEST", null, 400);
  if (!industry || !industry.trim()) return error("Industry is required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  // 1. LIMIT ENFORCEMENT
  const limitCheck = await enforceLimits(db, session.user_id, 'brand');
  if (!limitCheck.allowed) {
    return error(limitCheck.message, "UPGRADE_REQUIRED", { 
      error: "UPGRADE_REQUIRED",
      message: limitCheck.message 
    }, 403);
  }

  const brandId = crypto.randomUUID();

  try {
    await db.batch([
      db.prepare(
        `
        INSERT INTO brands (
          id,
          owner_user_id,
          name,
          industry,
          tone,
          goals,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `
      ).bind(
        brandId,
        session.user_id,
        name.trim(),
        industry.trim(),
        tone ? String(tone).trim() : null,
        goals ? String(goals).trim() : null
      ),
      db.prepare(
        `
        INSERT INTO brand_users (user_id, brand_id, role, created_at)
        VALUES (?, ?, 'owner', datetime('now'))
        `
      ).bind(session.user_id, brandId)
    ]);

    // 2. RECALCULATE USAGE
    await recalculateUsage(db, session.user_id);
  } catch (err) {
    console.error("[CREATE BRAND FAILED]", err?.message || err);
    return error("Failed to create brand", "SERVER_ERROR", err?.message || err, 500);
  }

  return json(
    {
      id: brandId,
      name: name.trim(),
      industry: industry.trim(),
      requires_token_refresh: true,
    },
    201
  );
}

/**
 * Enhanced createBrand for session-aware switching
 */
export async function createBrandRequest(request, env, session) {
  const result = await createBrand(request, env, session);
  if (result.status === 201) {
    const data = await result.json();
    // ✅ ISSUE NEW JWT IMMEDIATELY FOR THE NEW BRAND
    const jwt = await issueJWT(
      {
        user_id: session.user_id,
        brand_id: data.id,
        email: session.email,
        role: session.role
      },
      env
    );
    return json({ ...data, token: jwt }, 201);
  }
  return result;
}

/* ======================================================
   LIST BRANDS
====================================================== */
export async function listBrands(_request, env, session) {
  if (!session?.user_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  const db = getDB(env);

  try {
    const { results } = await db
      .prepare(
        `
        SELECT
          b.id,
          b.name,
          b.industry,
          b.tone,
          b.goals,
          b.created_at
        FROM brands b
        JOIN brand_users bu ON bu.brand_id = b.id
        WHERE bu.user_id = ?
        ORDER BY b.created_at DESC
        `
      )
      .bind(session.user_id)
      .all();

    const brands = (results || []).map(b => ({
      id: b.id,
      name: b.name,
      industry: b.industry,
      tone: b.tone,
      goals: b.goals,
      created_at: b.created_at,
    }));

    return json({ brands });
  } catch (err) {
    console.error("[LIST BRANDS FAILED]", err?.message || err);
    return error("Failed to fetch brands", 500);
  }
}

/* ======================================================
   SWITCH BRAND
====================================================== */
export async function switchBrand(request, env, session) {
  if (!session?.user_id) {
    return error("Unauthorized", 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const { brand_id } = body || {};
  if (!brand_id || !isValidUUID(brand_id)) return error("Valid brand_id is required", 400);

  const db = getDB(env);

  const exists = await db
    .prepare(
      `
      SELECT 1
      FROM brand_users
      WHERE brand_id = ?
        AND user_id = ?
      `
    )
    .bind(brand_id, session.user_id)
    .first();

  if (!exists) {
    return error("Brand not accessible", 403);
  }

  // ✅ ISSUE NEW JWT WITH BRAND CONTEXT
  const jwt = await issueJWT(
    {
      user_id: session.user_id,
      brand_id: brand_id,
      email: session.email,
      role: session.role
    },
    env
  );

  return json({ success: true, brand_id, token: jwt });
}

/* ======================================================
   BRAND SETTINGS
====================================================== */
export async function getBrandSettings(request, env, session) {
  const brandId = request.url.split("/").slice(-2)[0];
  if (!isValidUUID(brandId)) return error("Invalid brand ID", 400);

  const db = getDB(env);

  const row = await db
    .prepare(
      `
      SELECT b.*
      FROM brands b
      JOIN brand_users bu ON bu.brand_id = b.id
      WHERE b.id = ?
        AND bu.user_id = ?
      `
    )
    .bind(brandId, session.user_id)
    .first();

  if (!row) return error("Brand not found", 404);

  return json({
    id: row.id,
    name: row.name,
    industry: row.industry,
    tone: row.tone,
    goals: row.goals
  });
}

export async function updateBrandSettings(request, env, session) {
  const brandId = request.url.split("/").slice(-2)[0];
  if (!isValidUUID(brandId)) return error("Invalid brand ID", 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const db = getDB(env);

  const res = await db
    .prepare(
      `
      UPDATE brands
      SET name = COALESCE(?, name),
          industry = COALESCE(?, industry),
          tone = COALESCE(?, tone),
          goals = COALESCE(?, goals),
          updated_at = datetime('now')
      WHERE id = ?
        AND id IN (SELECT brand_id FROM brand_users WHERE user_id = ?)
      `
    )
    .bind(
      body.name || null,
      body.industry || null,
      body.tone || null,
      body.goals || null,
      brandId,
      session.user_id
    )
    .run();

  if (res.changes === 0) {
    return error("Brand not found", 404);
  }

  return json({ success: true });
}
