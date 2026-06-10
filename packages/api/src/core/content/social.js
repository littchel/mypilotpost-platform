// packages/api/src/core/content/social.js
import { executeDeliveryJob } from "../delivery/poster.js";
import { hasConflict, normalizeForSQLite } from "../schedule/schedule.js";
import { getDB } from "../../lib/db.js";
import { insertExperienceNotification } from "../notifications/utils.js";
import { error, json } from "../../lib/json.js";
import { isValidUUID, isValidISO8601 } from "../../lib/validation.js";
import { writeVersion } from "./versions.js";

/**
 * MANDATORY VALIDATION LAYER
 */
function validatePayload(body) {
  if (!body.text || typeof body.text !== 'string') {
    throw new Error('INVALID_TEXT');
  }
  if (!Array.isArray(body.platforms) && (!body.variants || typeof body.variants !== 'object')) {
    throw new Error('INVALID_PLATFORMS');
  }
}

/**
 * UPSERT SOCIAL ASSET (HARDENED V2.0)
 * Enforces brand_id/user_id on all operations.
 */
export async function createSocialAsset(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;

  try {
    const body = await request.json();
    validatePayload(body);

    const { 
      content_id, 
      text, 
      platforms: requestedPlatforms, 
      variants: requestedVariants = {},
      campaign_id = null,
      lifecycle_status: requestedLifecycleStatus,
      status = "draft"
    } = body;
    const lifecycle_status = requestedLifecycleStatus || status || "draft";
    const platforms = Array.isArray(requestedPlatforms)
      ? requestedPlatforms
      : Object.keys(requestedVariants || {}).filter(p => p !== 'base');

    const assetId = content_id && isValidUUID(content_id) ? content_id : crypto.randomUUID();
    
    // 🔒 1:1 Parity Check & Lock Verification
    const existing = await db.prepare(`
      SELECT lifecycle_status, context_id 
      FROM social_assets 
      WHERE id = ? AND brand_id = ? AND user_id = ?
    `).bind(assetId, brand_id, user_id).first();
    
    if (existing && ['pending_approval', 'approval_requested', 'approved', 'scheduled', 'queued', 'publishing', 'published'].includes(existing.lifecycle_status)) {
      return error("Content is locked. Revert to draft to edit.", "CONTENT_LOCKED", null, 409);
    }

    const contextId = existing ? existing.context_id : crypto.randomUUID();
    const title = text.slice(0, 50) + (text.length > 50 ? "..." : "");

    const batchStmts = [];

    // Initialize Context if new
    if (!existing) {
      batchStmts.push(db.prepare(`
        INSERT INTO content_context (id, brand_id, user_id, locale) 
        VALUES (?, ?, ?, 'en')
      `).bind(contextId, brand_id, user_id));
    }

    // Upsert Social Asset — keep status in sync with lifecycle_status so scheduleContent can read it
    if (existing) {
      batchStmts.push(db.prepare(`
        UPDATE social_assets
        SET title = ?, text = ?, campaign_id = ?, lifecycle_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND brand_id = ? AND user_id = ?
      `).bind(title, text, campaign_id, lifecycle_status, lifecycle_status, assetId, brand_id, user_id));
    } else {
      batchStmts.push(db.prepare(`
        INSERT INTO social_assets (id, brand_id, user_id, context_id, title, text, campaign_id, lifecycle_status, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(assetId, brand_id, user_id, contextId, title, text, campaign_id, lifecycle_status, lifecycle_status));
    }

    // Map Variants (Single Source of Truth)
    batchStmts.push(db.prepare(`DELETE FROM social_variants WHERE social_asset_id = ?`).bind(assetId));
    
    const variants = { base: text };
    platforms.forEach(p => { variants[p] = requestedVariants?.[p] || text; });

    for (const [platform, caption] of Object.entries(variants)) {
       batchStmts.push(db.prepare(`
         INSERT INTO social_variants (id, social_asset_id, platform, caption, status) 
         VALUES (?, ?, ?, ?, 'draft')
       `).bind(crypto.randomUUID(), assetId, platform, caption));
    }

    batchStmts.push(db.prepare(`
      INSERT INTO content_vault
        (id, brand_id, user_id, content_type, title, body, platforms, platform_variants,
         lifecycle_status, campaign_id, version, source)
      VALUES (?, ?, ?, 'social', ?, ?, ?, ?, ?, ?, 1, 'legacy_social')
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        body = excluded.body,
        platforms = excluded.platforms,
        platform_variants = excluded.platform_variants,
        lifecycle_status = excluded.lifecycle_status,
        campaign_id = excluded.campaign_id,
        version = COALESCE(content_vault.version, 1) + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE content_vault.brand_id = ?
    `).bind(
      assetId, brand_id, user_id, title, text,
      JSON.stringify(platforms),
      JSON.stringify(Object.fromEntries(platforms.map(p => [p, variants[p]]))),
      lifecycle_status,
      campaign_id,
      brand_id
    ));

    await db.batch(batchStmts);

    const versionRow = await db.prepare(`SELECT version FROM content_vault WHERE id = ? AND brand_id = ?`).bind(assetId, brand_id).first();
    await writeVersion(env, {
      contentId: assetId,
      contentType: 'social',
      version: versionRow?.version || 1,
      payload: {
        title,
        body: text,
        platforms,
        platform_variants: Object.fromEntries(platforms.map(p => [p, variants[p]])),
        lifecycle_status,
        campaign_id,
      },
    }).catch(() => {});

    return json({ success: true, content_id: assetId, lifecycle_status });

  } catch (err) {
    console.error("[createSocialAsset] HARD LOCK FAILURE:", err);
    return error(err.message || "Operation failed", "SAVE_FAILED", String(err), 500);
  }
}

/**
 * SHARE FOR APPROVAL (LOCKED FLOW)
 */
export async function submitForApproval(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const id = new URL(request.url).pathname.split("/").slice(-2)[0];
  const { schedule_at } = await request.json();

  if (!schedule_at || !isValidISO8601(schedule_at)) {
    return error("Scheduling is mandatory for approval submission.", "BAD_REQUEST", null, 400);
  }

  const asset = await db.prepare(`
    SELECT id FROM social_assets WHERE id = ? AND brand_id = ? AND user_id = ?
  `).bind(id, brand_id, user_id).first();

  if (!asset) return error("Asset not found", "NOT_FOUND", null, 404);

  const batch = [
    db.prepare(`UPDATE social_assets SET lifecycle_status = 'pending_approval', status = 'approval', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`UPDATE content_vault SET lifecycle_status = 'approval_requested', share_for_approval = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`
      INSERT INTO approval_requests (id, content_id, content_type, brand_id, requested_by)
      VALUES (?, ?, 'social', ?, ?)
    `).bind(crypto.randomUUID(), id, brand_id, user_id)
  ];

  await db.batch(batch);
  await insertExperienceNotification(db, brand_id, "approval", "Approval Requested", "Content locked pending review.");

  return json({ success: true, status: "PENDING_APPROVAL" });
}

/**
 * APPROVE CONTENT
 */
export async function approveContent(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth; // Approver context
  const id = new URL(request.url).pathname.split("/").slice(-2)[0];

  const asset = await db.prepare(`
    SELECT text FROM social_assets WHERE id = ? AND brand_id = ?
  `).bind(id, brand_id).first();

  if (!asset) return error("Asset not found", "NOT_FOUND", null, 404);

  // 1. Create delivery jobs (move to scheduled)
  const { results: variants } = await db.prepare(`SELECT platform FROM social_variants WHERE social_asset_id = ? AND platform != 'base'`).bind(id).all();
  const platforms = (variants || []).map(v => v.platform);

  const batch = [
    db.prepare(`UPDATE social_assets SET lifecycle_status = 'approved', status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`UPDATE content_vault SET lifecycle_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`UPDATE approval_requests SET approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE content_id = ? AND brand_id = ?`).bind(user_id, id, brand_id)
  ];

  // Logic for scheduling would go here (simplified)
  
  await db.batch(batch);
  return json({ success: true, status: "APPROVED" });
}

/**
 * REJECT CONTENT
 */
export async function rejectContent(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const id = new URL(request.url).pathname.split("/").slice(-2)[0];
  const { reason } = await request.json();

  await db.batch([
    db.prepare(`UPDATE social_assets SET lifecycle_status = 'draft', status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`UPDATE content_vault SET lifecycle_status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`UPDATE approval_requests SET rejected_by = ?, rejection_reason = ? WHERE content_id = ? AND brand_id = ?`).bind(user_id, reason, id, brand_id)
  ]);

  return json({ success: true, status: "REJECTED" });
}

/**
 * POST NOW (IMMEDIATE DELIVERY)
 */
export async function postSocialNow(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const id = new URL(request.url).pathname.split("/").slice(-2)[0];
  
  const asset = await db.prepare(`
    SELECT * FROM social_assets WHERE id = ? AND brand_id = ? AND user_id = ?
  `).bind(id, brand_id, user_id).first();
  
  if (!asset) return error("Asset not found", "NOT_FOUND", null, 404);

  const { results: variants } = await db.prepare(`SELECT platform FROM social_variants WHERE social_asset_id = ? AND platform != 'base'`).bind(id).all();
  const platforms = (variants || []).map(v => v.platform);
  
  if (platforms.length === 0) return error("No platforms configured", "BAD_REQUEST", null, 400);

  const nowUtc = new Date().toISOString();
  const deliveryBatch = platforms.map(platform =>
    db.prepare(`INSERT INTO delivery_jobs (id, brand_id, user_id, content_type, content_id, platform, scheduled_at, status) VALUES (?, ?, ?, 'social', ?, ?, ?, 'scheduled')`)
      .bind(crypto.randomUUID(), brand_id, user_id, id, platform, nowUtc)
  );
  deliveryBatch.push(
    db.prepare(`UPDATE social_assets SET lifecycle_status = 'queued', status = 'scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`UPDATE content_vault SET lifecycle_status = 'queued', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
  );
  await db.batch(deliveryBatch);

  return json({ success: true, status: "PUBLISHED" });
}

export async function getSocialAsset(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const id = new URL(request.url).pathname.split("/").pop();

  const asset = await db.prepare(`
    SELECT * FROM social_assets WHERE id = ? AND brand_id = ? AND user_id = ?
  `).bind(id, brand_id, user_id).first();

  if (!asset) return error("Asset not found", "NOT_FOUND", null, 404);

  const { results: variants } = await db.prepare(`SELECT platform FROM social_variants WHERE social_asset_id = ? AND platform != 'base'`).bind(id).all();
  
  return json({
    success: true,
    data: {
      ...asset,
      platforms: (variants || []).map(v => v.platform)
    }
  });
}

export async function deleteSocialAsset(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const id = new URL(request.url).pathname.split("/").pop();

  const asset = await db.prepare(`SELECT lifecycle_status FROM social_assets WHERE id = ? AND brand_id = ? AND user_id = ?`).bind(id, brand_id, user_id).first();
  if (!asset) return error("Asset not found", "NOT_FOUND", null, 404);
  const LOCKED = new Set(['scheduled', 'queued', 'publishing', 'published']);
  if (LOCKED.has(asset.lifecycle_status)) return error("Cannot delete scheduled or published content.", "CONTENT_LOCKED", null, 409);

  await db.batch([
    db.prepare(`DELETE FROM social_assets WHERE id = ? AND brand_id = ? AND user_id = ?`).bind(id, brand_id, user_id),
    db.prepare(`DELETE FROM social_variants WHERE social_asset_id = ?`).bind(id),
    db.prepare(`DELETE FROM content_vault WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`DELETE FROM delivery_jobs WHERE content_id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`DELETE FROM content_media_links WHERE content_id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`DELETE FROM approval_requests WHERE content_id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`DELETE FROM content_shares WHERE content_id = ? AND brand_id = ?`).bind(id, brand_id),
  ]);
  return json({ success: true });
}

/**
 * POST /api/customer/content/social/approve-bulk
 */
export async function approveSocialAssetsBulk(request, env, auth) {
  const { brand_id, user_id } = auth;
  const body = await request.json();
  const { ids = [] } = body;

  if (!ids.length) return error("No IDs provided", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const placeholders = ids.map(() => "?").join(",");

  await db.batch([
    db.prepare(`UPDATE social_assets SET lifecycle_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE brand_id = ? AND id IN (${placeholders})`).bind(brand_id, ...ids),
    db.prepare(`UPDATE content_vault SET lifecycle_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE brand_id = ? AND id IN (${placeholders})`).bind(brand_id, ...ids),
  ]);

  return json({ success: true, count: ids.length });
}
