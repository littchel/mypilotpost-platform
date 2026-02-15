import { nanoid } from "nanoid";
import { nowISO } from "../../lib/dates.js";
import { db } from "../../lib/db.js";
import { emitMission } from "../missions.js";

export async function runLocalSeoScan({ brand_id, triggered_by = "manual" }) {
  const brand = await db.get(
    `SELECT target_locations FROM seo_brand_knowledge WHERE brand_id = ?`,
    [brand_id]
  );

  if (!brand || !brand.target_locations) return { skipped: true };

  const locations = JSON.parse(brand.target_locations);
  if (!locations.length) return { skipped: true };

  for (const location of locations) {
    const keywordHits = await db.get(
      `
      SELECT COUNT(*) AS count
      FROM seo_keywords
      WHERE brand_id = ? AND keyword LIKE ?
      `,
      [brand_id, `%${location}%`]
    );

    if (keywordHits.count === 0) {
      await db.run(
        `
        INSERT INTO seo_local_signals (
          id, brand_id, location, signal_type, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          nanoid(),
          brand_id,
          location,
          "coverage_gap",
          "No keywords explicitly targeting this location",
          nowISO(),
        ]
      );
    }
  }

  await emitMission({
    brand_id,
    type: "seo_local_scan",
    meta: { locations_checked: locations.length, triggered_by },
  });

  return { scanned: true };
}
