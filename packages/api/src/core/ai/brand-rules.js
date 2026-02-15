import { getDB } from "../../lib/db.js";

export async function getBrandRules(env, brandId) {
  const db = getDB(env);

  const prefs = await db.prepare(`
    SELECT preferences
    FROM brand_preferences
    WHERE brand_id = ?
  `)
  .bind(brandId)
  .first();

  return {
    tone: prefs?.preferences?.tone || "professional",
    bannedWords: prefs?.preferences?.banned_words || [],
    emojiLevel: prefs?.preferences?.emoji_level || "low",
  };
}
