import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { isValidUUID, isValidISO8601 } from "../../lib/validation.js";
import { normalizeForSQLite, hasConflict } from "../schedule/schedule.js";
import { completeReferral } from "../promotions/promotions.js";
import { checkAndIncrement } from "../billing/enforcement.js";
import crypto from "crypto";

/* =====================================================
   CORE SCHEDULING LOGIC
   ===================================================== */

/**
 * Triggers high-resolution template asset generation and maps URLs to media_assets/content_media_links.
 */
async function processAssetGeneration(db, content_id, brand_id, user_id, platforms, env) {
  const row = await db.prepare("SELECT layout_manifest FROM content_vault WHERE id = ? AND brand_id = ?").bind(content_id, brand_id).first();
  if (!row || !row.layout_manifest) return;

  let manifest;
  try {
    manifest = JSON.parse(row.layout_manifest);
  } catch (e) {
    console.warn("[SCHEDULER] Failed to parse layout_manifest:", e.message);
    return;
  }

  const { generateFinalAsset } = await import("../templates/assetGenerator.js");
  const targetPlatform = platforms[0] || "instagram";
  const jobId = crypto.randomUUID();

  try {
    const { asset_urls } = await generateFinalAsset(manifest, brand_id, targetPlatform, jobId, env);

    // Clear existing media links for this content (replacing preview media with finalized templates)
    await db.prepare("DELETE FROM content_media_links WHERE content_id = ? AND brand_id = ?").bind(content_id, brand_id).run();

    for (let idx = 0; idx < asset_urls.length; idx++) {
      const url = asset_urls[idx];
      const media_id = crypto.randomUUID();

      // 1. Insert into media_assets
      await db.prepare(`
        INSERT INTO media_assets (id, brand_id, provider, external_id, preview_url, type, created_at)
        VALUES (?, ?, 'upload', ?, ?, 'image', CURRENT_TIMESTAMP)
      `).bind(media_id, brand_id, `deliveries/${jobId}/${idx}`, url).run();

      // 2. Link in content_media_links
      await db.prepare(`
        INSERT INTO content_media_links (content_id, brand_id, media_id, position, role)
        VALUES (?, ?, ?, ?, ?)
      `).bind(content_id, brand_id, media_id, idx, idx === 0 ? 'primary' : 'secondary').run();
    }
  } catch (err) {
    console.error("[SCHEDULER] generateFinalAsset failed:", err.message);
    throw new Error(`failed_asset_generation: ${err.message}`);
  }
}

/**
 * Creates delivery jobs for a content item across platforms.
 * Enforces 'approved' status and future-time validation.
 */
export async function scheduleContent(request, env, auth) {
  const { brand_id } = auth || {};
  if (!brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const body = await request.json();
  const { content_id, content_type, platforms = [], scheduled_at } = body;

  // 1. Core Validation
  if (!content_id || !content_type || platforms.length === 0 || !scheduled_at) {
    return error("Missing required fields", "BAD_REQUEST", null, 400);
  }

  if (!isValidUUID(content_id)) return error("Invalid ID", "INVALID_ID", null, 400);
  
  const normalized = normalizeForSQLite(scheduled_at);
  if (!normalized || !isValidISO8601(scheduled_at)) return error("Invalid date format", "BAD_REQUEST", null, 400);

  // 2. Future Only Validation (UTC)
  if (new Date(scheduled_at) < new Date()) {
    return error("Cannot schedule in the past", "BAD_REQUEST", null, 400);
  }

  const db = getDB(env);

  // 3. Status Validation — read from canonical vault (not mirror tables)
  const contentTable = content_type === 'blog' ? 'blog_posts' : 'social_assets';
  const asset = await db.prepare(`SELECT lifecycle_status, campaign_id FROM content_vault WHERE id = ? AND brand_id = ?`).bind(content_id, brand_id).first();

  if (!asset) return error("Content not found", "NOT_FOUND", null, 404);

  const schedulableStates = ['approved', 'scheduled'];
  if (!schedulableStates.includes(asset.lifecycle_status)) {
    return error(`Content in state '${asset.lifecycle_status}' cannot be scheduled. Approve content first.`, "BAD_REQUEST", null, 400);
  }

  const campaignId = asset.campaign_id || null;

  // Trigger high-resolution asset generation if layout_manifest is present
  try {
    await processAssetGeneration(db, content_id, brand_id, auth.user_id, platforms, env);
  } catch (err) {
    return error(`Failed to generate template asset: ${err.message}`, "ASSET_GENERATION_FAILED", null, 500);
  }

  // 4. Quota Enforcement — check posts_per_month_limit before creating delivery jobs
  await checkAndIncrement(db, auth.user_id, 'posts');

  // 5. Atomic Job Creation
  const batch = [];
  for (const platform of platforms) {
     // Conflict check (15 min window)
     const conflict = await hasConflict(db, brand_id, platform, scheduled_at);
     if (conflict) continue; // Skip conflicts or return error? The user wants high-resilience. Let's skip and report.

     const jobId = crypto.randomUUID();
     batch.push(db.prepare(`
       INSERT INTO delivery_jobs (id, brand_id, user_id, content_type, content_id, platform, scheduled_at, status, campaign_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
     `).bind(jobId, brand_id, auth.user_id, content_type, content_id, platform, normalized, campaignId));
  }

  if (batch.length === 0) return error("All platform slots are conflicted or already scheduled.", "CONFLICT", null, 409);

  // Update asset status to 'scheduled'
  batch.push(db.prepare(`UPDATE ${contentTable} SET status = 'scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(content_id, brand_id));
  batch.push(db.prepare(`UPDATE content_vault SET lifecycle_status = 'scheduled', scheduled_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(normalized, content_id, brand_id));
  batch.push(db.prepare(`UPDATE content_drafts SET state = 'scheduled', updated_at = CURRENT_TIMESTAMP WHERE content_id = ? AND brand_id = ?`).bind(content_id, brand_id));

  await db.batch(batch);

  // Trigger referral completion (Activity check)
  await completeReferral(db, auth.user_id, env);

  return json({ success: true, count: batch.length - 3 });
}

/**
 * Updates the scheduled_at time for existing jobs.
 * SAFETY: Only updates jobs with status = 'scheduled'.
 */
export async function rescheduleContent(request, env, auth) {
  const { brand_id } = auth || {};
  if (!brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const { content_id, new_scheduled_at } = await request.json();
  if (!content_id || !new_scheduled_at) return error("Missing fields", "BAD_REQUEST", null, 400);

  const normalized = normalizeForSQLite(new_scheduled_at);
  if (!normalized) return error("Invalid date", "BAD_REQUEST", null, 400);

  if (new Date(new_scheduled_at) < new Date()) {
    return error("Cannot reschedule to the past", "BAD_REQUEST", null, 400);
  }

  const db = getDB(env);

  const result = await db.prepare(`
    UPDATE delivery_jobs
    SET scheduled_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE content_id = ? 
      AND brand_id = ? 
      AND status = 'scheduled'
  `).bind(normalized, content_id, brand_id).run();

  if (result.meta.changes === 0) {
    return error("No upcoming jobs found to reschedule.", "NOT_FOUND", null, 404);
  }

  return json({ success: true, updated: result.meta.changes });
}

/**
 * Triggers immediate delivery by creating jobs with scheduled_at = NOW.
 * DUPLICATION PROTECTION: Checks if jobs already exist in scheduled/processing state.
 */
export async function postNow(request, env, auth) {
  const { brand_id } = auth || {};
  if (!brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const { content_id, content_type, platforms = [] } = await request.json();
  if (!content_id || !content_type || platforms.length === 0) return error("Missing fields", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const nowUtc = new Date().toISOString();
  const normalizedNow = normalizeForSQLite(nowUtc);

  // Trigger high-resolution asset generation if layout_manifest is present
  try {
    await processAssetGeneration(db, content_id, brand_id, auth.user_id, platforms, env);
  } catch (err) {
    return error(`Failed to generate template asset: ${err.message}`, "ASSET_GENERATION_FAILED", null, 500);
  }

  const batch = [];
  let createdCount = 0;

  for (const platform of platforms) {
    // 🛡️ Duplication Protection
    const existing = await db.prepare(`
      SELECT id FROM delivery_jobs
      WHERE content_id = ? AND platform = ? AND status IN ('scheduled', 'processing')
    `).bind(content_id, platform).first();

    if (existing) {
       console.log(`POST_NOW: Reusing existing job for ${platform}`, existing.id);
       continue;
    }

    const jobId = crypto.randomUUID();
    batch.push(db.prepare(`
      INSERT INTO delivery_jobs (id, brand_id, user_id, content_type, content_id, platform, scheduled_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `).bind(jobId, brand_id, auth.user_id, content_type, content_id, platform, normalizedNow));
    createdCount++;
  }

  if (batch.length > 0) {
    const contentTable = content_type === 'blog' ? 'blog_posts' : 'social_assets';
    batch.push(db.prepare(`
      UPDATE content_vault
      SET lifecycle_status = 'queued', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND brand_id = ?
    `).bind(content_id, brand_id));
    batch.push(db.prepare(`
      UPDATE ${contentTable}
      SET lifecycle_status = 'queued', status = 'scheduled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND brand_id = ?
    `).bind(content_id, brand_id));
    await db.batch(batch);
    // Trigger referral completion (Activity check)
    await completeReferral(db, auth.user_id, env);
  }

  return json({ success: true, created: createdCount });
}
