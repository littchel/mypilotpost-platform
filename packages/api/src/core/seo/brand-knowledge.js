import { nanoid } from "nanoid";
import { nowISO } from "../../lib/dates.js";
import { db } from "../../lib/db.js";
import { emitMission } from "../missions.js";

/**
 * Normalize optional JSON fields safely
 */
function toJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

/**
 * Fetch brand knowledge graph
 */
export async function getBrandKnowledge({ brand_id }) {
  if (!brand_id) {
    throw new Error("brand_id is required");
  }

  const row = await db.get(
    `
    SELECT *
    FROM seo_brand_knowledge
    WHERE brand_id = ?
    `,
    [brand_id]
  );

  if (!row) return null;

  return {
    ...row,
    brand_variations: row.brand_variations
      ? JSON.parse(row.brand_variations)
      : [],
    offerings: row.offerings ? JSON.parse(row.offerings) : [],
    target_audiences: row.target_audiences
      ? JSON.parse(row.target_audiences)
      : [],
    target_locations: row.target_locations
      ? JSON.parse(row.target_locations)
      : [],
    language_signals: row.language_signals
      ? JSON.parse(row.language_signals)
      : null,
  };
}

/**
 * Create or update brand knowledge graph
 */
export async function upsertBrandKnowledge({
  brand_id,
  brand_name,
  brand_variations,
  industry,
  offerings,
  target_audiences,
  target_locations,
  language_signals,
  notes,
}) {
  if (!brand_id || !brand_name) {
    throw new Error("brand_id and brand_name are required");
  }

  const existing = await db.get(
    `
    SELECT id
    FROM seo_brand_knowledge
    WHERE brand_id = ?
    `,
    [brand_id]
  );

  const now = nowISO();

  if (!existing) {
    // CREATE
    const id = nanoid();

    await db.run(
      `
      INSERT INTO seo_brand_knowledge (
        id,
        brand_id,
        brand_name,
        brand_variations,
        industry,
        offerings,
        target_audiences,
        target_locations,
        language_signals,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        brand_id,
        brand_name,
        toJson(brand_variations),
        industry || null,
        toJson(offerings),
        toJson(target_audiences),
        toJson(target_locations),
        toJson(language_signals),
        notes || null,
        now,
        now,
      ]
    );

    await emitMission({
      brand_id,
      type: "seo_brand_knowledge_created",
      ref_id: id,
    });

    return { created: true, id };
  }

  // UPDATE
  await db.run(
    `
    UPDATE seo_brand_knowledge
    SET
      brand_name = COALESCE(?, brand_name),
      brand_variations = COALESCE(?, brand_variations),
      industry = COALESCE(?, industry),
      offerings = COALESCE(?, offerings),
      target_audiences = COALESCE(?, target_audiences),
      target_locations = COALESCE(?, target_locations),
      language_signals = COALESCE(?, language_signals),
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE brand_id = ?
    `,
    [
      brand_name,
      toJson(brand_variations),
      industry,
      toJson(offerings),
      toJson(target_audiences),
      toJson(target_locations),
      toJson(language_signals),
      notes,
      now,
      brand_id,
    ]
  );

  await emitMission({
    brand_id,
    type: "seo_brand_knowledge_updated",
    ref_id: existing.id,
  });

  return { updated: true, id: existing.id };
}
