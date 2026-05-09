// packages/api/src/core/notifications/utils.js

import { getDB } from "../../lib/db.js";

/**
 * Standardized Experience Notification Insertion
 * - Prevents duplicates within 24h for the same brand and type
 * - Enforces correct recipient model (brand-scoped)
 * - Brand voice compliant
 */
export async function insertExperienceNotification(db, brandId, type, title, message) {
  // 0. Type Enum Consistency
  const allowed = ["success", "failure", "scheduling"];
  const isIntelligence = type.startsWith("intelligence");
  if (!allowed.includes(type) && !isIntelligence) {
    console.warn(`NOTIFICATION: Invalid type ${type} ignored.`);
    return null;
  }

  // 1. Deduplication check (once per 24h per brand/type/title)
  // Standard types are throttled by type; failures and intelligence are throttled by title (category/platform)
  const dedupField = (type === 'failure' || isIntelligence) ? 'title' : 'type';
  const dedupValue = (type === 'failure' || isIntelligence) ? title : type;

  const existing = await db
    .prepare(
      `
      SELECT 1 FROM notifications 
      WHERE brand_id = ? 
        AND ${dedupField} = ? 
        AND created_at >= datetime('now', '-24 hours')
      LIMIT 1
      `
    )
    .bind(brandId, dedupValue)
    .first();

  if (existing) {
    console.log(`NOTIFICATION: Throttled duplicate ${type} (${dedupValue}) for brand ${brandId}`);
    return null;
  }

  // 2. Insert with brand-scoped recipient model
  const id = crypto.randomUUID();
  await db
    .prepare(
      `
      INSERT INTO notifications (
        id, 
        recipient_type, 
        recipient_id, 
        brand_id, 
        type, 
        title, 
        message, 
        created_at
      ) VALUES (?, 'brand', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
    )
    .bind(id, brandId, brandId, type, title, message)
    .run();

  return id;
}
