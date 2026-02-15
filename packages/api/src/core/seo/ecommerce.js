import { nanoid } from "nanoid";
import { nowISO } from "../../lib/dates.js";
import { db } from "../../lib/db.js";
import { emitMission } from "../missions.js";

export async function runEcommerceSeoScan({
  brand_id,
  external_ref,
  triggered_by = "manual",
}) {
  const keywordCount = await db.get(
    `
    SELECT COUNT(*) AS count
    FROM seo_keywords
    WHERE brand_id = ?
    `,
    [brand_id]
  );

  if (keywordCount.count === 0) {
    await db.run(
      `
      INSERT INTO seo_ecommerce_signals (
        id, brand_id, external_ref, signal_type, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        nanoid(),
        brand_id,
        external_ref,
        "no_keyword_target",
        "No SEO keywords defined for this brand",
        nowISO(),
      ]
    );
  }

  await emitMission({
    brand_id,
    type: "seo_ecommerce_scan",
    meta: { external_ref, triggered_by },
  });

  return { scanned: true };
}
