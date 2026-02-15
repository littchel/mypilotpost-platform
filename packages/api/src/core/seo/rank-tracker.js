import { nanoid } from "nanoid";
import { nowISO } from "../../lib/dates.js";
import { db } from "../../lib/db.js";
import { emitMission } from "../missions.js";
import { fetchSerpPosition } from "./serp-provider.js";
import { writeBrandMemoryEvent } from "../brand/memory-writer.js";

/**
 * Run a rank check for a keyword
 */
export async function runRankCheck({
  brand_id,
  keyword_id,
  location = "Global",
  triggered_by = "manual",
}) {
  // 1. Load keyword
  const keyword = await db.get(
    `SELECT * FROM seo_keywords WHERE id = ? AND brand_id = ?`,
    [keyword_id, brand_id]
  );

  if (!keyword) {
    throw new Error("Keyword not found for brand");
  }

  // 2. Load targets
  const targets = await db.all(
    `
    SELECT t.blog_post_id, b.slug
    FROM seo_keyword_targets t
    JOIN blog_posts b ON b.id = t.blog_post_id
    WHERE t.keyword_id = ? AND t.brand_id = ?
      AND b.status = 'published'
    `,
    [keyword_id, brand_id]
  );

  if (targets.length === 0) {
    return { skipped: true, reason: "no published targets" };
  }

  const results = [];

  // 3. Rank check per target
  for (const target of targets) {
    let rank = null;
    let url = null;

    try {
      const serp = await fetchSerpPosition({
        keyword: keyword.keyword,
        slug: target.slug,
        location,
      });

      rank = serp?.rank ?? null;
      url = serp?.url ?? null;
    } catch (err) {
      console.warn("[RANK CHECK FAILED]", {
        keyword: keyword.keyword,
        blog_post_id: target.blog_post_id,
        error: err.message,
      });
    }

    // 3.1 Load previous rank (most recent, same context)
    const previous = await db.get(
      `
      SELECT rank
      FROM seo_rank_history
      WHERE brand_id = ?
        AND keyword_id = ?
        AND blog_post_id = ?
        AND location = ?
      ORDER BY checked_at DESC
      LIMIT 1
      `,
      [brand_id, keyword_id, target.blog_post_id, location]
    );

    const previousRank =
      previous && typeof previous.rank === "number"
        ? previous.rank
        : null;

    // 4. Append history (always)
    await db.run(
      `
      INSERT INTO seo_rank_history (
        id,
        brand_id,
        keyword_id,
        blog_post_id,
        location,
        rank,
        url,
        checked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nanoid(),
        brand_id,
        keyword_id,
        target.blog_post_id,
        location,
        rank,
        url,
        nowISO(),
      ]
    );

    // 🔐 Brand Memory: confirmed rank change only
    if (
      rank !== null &&
      previousRank !== null &&
      rank !== previousRank
    ) {
      await writeBrandMemoryEvent(db, {
        brandId: brand_id,
        eventType: "seo_rank_changed",
        sourceEngine: "seo",
        entityType: "keyword",
        entityId: keyword.keyword,
        snapshot: {
          previous_rank: previousRank,
          current_rank: rank,
          delta: previousRank - rank,
          location,
          blog_post_id: target.blog_post_id
        }
      });
    }

    results.push({
      blog_post_id: target.blog_post_id,
      rank,
      url,
    });
  }

  // 5. Emit mission
  await emitMission({
    brand_id,
    type: "seo_rank_checked",
    ref_id: keyword_id,
    meta: {
      location,
      targets_checked: results.length,
      triggered_by,
    },
  });

  return {
    keyword: keyword.keyword,
    location,
    results,
  };
}
