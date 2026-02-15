import { json } from "../../lib/json.js";
import { db } from "../../lib/db.js";

/**
 * GET /api/admin/brands/:id/memory
 *
 * Read-only access to raw brand memory events.
 * Immutable history. No inference. No mutation.
 */
export async function getBrandMemory(request, env, brandId) {
  const url = new URL(request.url);

  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "50", 10),
    200
  );

  const eventType = url.searchParams.get("type") || null;

  let sql = `
    SELECT
      id,
      event_type,
      source_engine,
      entity_type,
      entity_id,
      snapshot,
      created_at
    FROM brand_memory_events
    WHERE brand_id = ?
  `;

  const params = [brandId];

  if (eventType) {
    sql += " AND event_type = ?";
    params.push(eventType);
  }

  sql += `
    ORDER BY created_at DESC
    LIMIT ?
  `;

  params.push(limit);

  const res = await db(env)
    .prepare(sql)
    .bind(...params)
    .all();

  return json({
    brand_id: brandId,
    count: res.results.length,
    events: res.results.map((row) => ({
      id: row.id,
      event_type: row.event_type,
      source_engine: row.source_engine,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      snapshot: JSON.parse(row.snapshot),
      created_at: row.created_at
    }))
  });
}

/**
 * GET /api/admin/brands/:id/patterns
 *
 * Read-only access to derived brand patterns.
 */
export async function getBrandPatterns(request, env, brandId) {
  const res = await db(env)
    .prepare(`
      SELECT
        id,
        pattern_type,
        description,
        supporting_event_count,
        confidence_score,
        first_seen,
        last_confirmed,
        status
      FROM brand_patterns
      WHERE brand_id = ?
      ORDER BY last_confirmed DESC
    `)
    .bind(brandId)
    .all();

  return json({
    brand_id: brandId,
    patterns: res.results || []
  });
}

/**
 * GET /api/admin/brands/:id/preferences
 *
 * Read-only access to brand preferences.
 */
export async function getBrandPreferences(request, env, brandId) {
  const row = await db(env)
    .prepare(`
      SELECT *
      FROM brand_preferences
      WHERE brand_id = ?
    `)
    .bind(brandId)
    .first();

  if (!row) {
    return json({
      brand_id: brandId,
      preferences: null
    });
  }

  return json({
    brand_id: brandId,
    preferences: {
      tone: row.tone,
      preferred_platforms: row.preferred_platforms
        ? JSON.parse(row.preferred_platforms)
        : [],
      avoided_platforms: row.avoided_platforms
        ? JSON.parse(row.avoided_platforms)
        : [],
      preferred_content_types: row.preferred_content_types
        ? JSON.parse(row.preferred_content_types)
        : [],
      preferred_locales: row.preferred_locales
        ? JSON.parse(row.preferred_locales)
        : [],
      updated_at: row.updated_at
    }
  });
}
