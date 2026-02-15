// packages/api/src/core/brands/brands.js
// PRODUCTION • PHASE 2B LOCKED
// Ownership model: brands.user_id (single-owner)

import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";

/* ======================================================
   CREATE BRAND
====================================================== */
export async function createBrand(request, env, session) {
  if (!session?.user_id) {
    return error("Unauthorized", 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const { name, industry, location } = body || {};

  if (!name || !name.trim()) return error("Brand name is required", 400);
  if (!industry || !industry.trim()) return error("Industry is required", 400);

  const db = getDB(env);
  const brandId = crypto.randomUUID();

  try {
    await db
      .prepare(
        `
        INSERT INTO brands (
          id,
          user_id,
          name,
          industry,
          location,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        `
      )
      .bind(
        brandId,
        session.user_id,
        name.trim(),
        industry.trim(),
        location ? String(location).trim() : null
      )
      .run();
  } catch (err) {
    console.error("[CREATE BRAND FAILED]", err?.message || err);
    return error("Failed to create brand", 500);
  }

  /**
   * NOTE:
   * Frontend MUST refresh auth context or re-issue JWT
   * to make this brand active.
   */
  return json(
    {
      id: brandId,
      name: name.trim(),
      industry: industry.trim(),
      location: location ? String(location).trim() : null,
      requires_token_refresh: true,
    },
    201
  );
}

/* ======================================================
   LIST BRANDS
====================================================== */
export async function listBrands(_request, env, session) {
  if (!session?.user_id) {
    return error("Unauthorized", 401);
  }

  const db = getDB(env);

  try {
    const { results } = await db
      .prepare(
        `
        SELECT
          id,
          name,
          industry,
          location,
          created_at
        FROM brands
        WHERE user_id = ?
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        `
      )
      .bind(session.user_id)
      .all();

    const brands = (results || []).map(b => ({
      id: b.id,
      name: b.name,
      industry: b.industry,
      location: b.location,
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
  if (!brand_id) return error("brand_id is required", 400);

  const db = getDB(env);

  const exists = await db
    .prepare(
      `
      SELECT 1
      FROM brands
      WHERE id = ?
        AND user_id = ?
        AND deleted_at IS NULL
      `
    )
    .bind(brand_id, session.user_id)
    .first();

  if (!exists) {
    console.warn("[SWITCH BRAND DENIED]", {
      user_id: session.user_id,
      brand_id,
    });
    return error("Brand not accessible", 403);
  }

  /**
   * NOTE:
   * Active brand is resolved from JWT.
   * Frontend must request a new token.
   */
  return json({ success: true, brand_id, requires_token_refresh: true });
}

/* ======================================================
   BRAND SETTINGS
====================================================== */
export async function getBrandSettings(request, env, session) {
  if (!session?.user_id) {
    return error("Unauthorized", 401);
  }

  const brandId = request.url.split("/").slice(-2)[0];
  const db = getDB(env);

  const row = await db
    .prepare(
      `
      SELECT settings
      FROM brands
      WHERE id = ?
        AND user_id = ?
        AND deleted_at IS NULL
      `
    )
    .bind(brandId, session.user_id)
    .first();

  if (!row) return error("Brand not found", 404);

  let settings;
  try {
    settings = row.settings
      ? JSON.parse(row.settings)
      : { timezone: "UTC", week_start: "monday" };
  } catch {
    settings = { timezone: "UTC", week_start: "monday" };
  }

  return json({ settings });
}

export async function updateBrandSettings(request, env, session) {
  if (!session?.user_id) {
    return error("Unauthorized", 401);
  }

  const brandId = request.url.split("/").slice(-2)[0];

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
      SET settings = ?
      WHERE id = ?
        AND user_id = ?
        AND deleted_at IS NULL
      `
    )
    .bind(JSON.stringify(body || {}), brandId, session.user_id)
    .run();

  if (res.changes === 0) {
    return error("Brand not found", 404);
  }

  return json({ success: true });
}
