/**
 * myPilotPost — Content Vault
 * Single source of truth for all content.
 * All editors (Create Post, Article, AI Studio) write here.
 * Approval, Scheduling, Delivery consume content_id from here.
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { isValidUUID, isValidISO8601 } from "../../lib/validation.js";
import { normalizeForSQLite, hasConflict } from "../schedule/schedule.js";
import { completeReferral } from "../promotions/promotions.js";
import { insertExperienceNotification } from "../notifications/utils.js";

const LOCKED_STATUSES = new Set(['scheduled', 'queued', 'publishing', 'published']);

/* ============================================================
   HELPERS
   ============================================================ */

function safe(v, fallback = '[]') {
  if (!v) return fallback;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

async function fetchVaultItem(db, id, brand_id) {
  return db.prepare(
    `SELECT * FROM content_vault WHERE id = ? AND brand_id = ?`
  ).bind(id, brand_id).first();
}

/* ============================================================
   GET /api/customer/vault
   List all content — unified across all types and statuses.
   ============================================================ */
export async function listVault(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id } = auth;
  const url    = new URL(request.url);
  const status = url.searchParams.get("status");   // filter by lifecycle_status
  const type   = url.searchParams.get("type");     // social | blog | campaign
  const limit  = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  const db = getDB(env);

  let q = `SELECT * FROM content_vault WHERE brand_id = ?`;
  const params = [brand_id];

  if (type) { q += ` AND content_type = ?`; params.push(type); }

  if (status === "scheduled") {
    q += ` AND lifecycle_status IN ('scheduled','queued','publishing')`;
  } else if (status === "pending") {
    q += ` AND lifecycle_status IN ('approval_requested','ready')`;
  } else if (status) {
    q += ` AND lifecycle_status = ?`;
    params.push(status);
  }

  q += ` ORDER BY updated_at DESC LIMIT ?`;
  params.push(limit);

  const { results } = await db.prepare(q).bind(...params).all();
  return json({ success: true, data: results || [] });
}

/* ============================================================
   POST /api/customer/vault
   Create or update a content item. Single write path.
   ============================================================ */
export async function saveToVault(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id, user_id } = auth;

  let body;
  try { body = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const {
    content_id,
    content_type = "social",
    title,
    body: bodyText = "",
    hook,
    cta,
    hashtags,
    platforms,
    platform_variants,
    media_ids,
    lifecycle_status = "draft",
    scheduled_at,
    campaign_id,
    metadata,
    source = "editor",
  } = body;

  if (!bodyText && !title) {
    return error("Content body or title required", "BAD_REQUEST", null, 400);
  }

  const id = (content_id && isValidUUID(content_id)) ? content_id : crypto.randomUUID();
  const db = getDB(env);

  // Lock check — prevent editing scheduled/published content
  const existing = await fetchVaultItem(db, id, brand_id);
  if (existing && LOCKED_STATUSES.has(existing.lifecycle_status)) {
    return error(
      `Content is ${existing.lifecycle_status} and cannot be edited. Duplicate it instead.`,
      "CONTENT_LOCKED", null, 409
    );
  }

  const derivedTitle = title || (bodyText.slice(0, 60) + (bodyText.length > 60 ? "…" : ""));
  const version      = existing ? (existing.version || 1) + 1 : 1;

  if (existing) {
    await db.prepare(`
      UPDATE content_vault SET
        title             = ?,
        body              = ?,
        hook              = ?,
        cta               = ?,
        hashtags          = ?,
        platforms         = ?,
        platform_variants = ?,
        media_ids         = ?,
        lifecycle_status  = ?,
        scheduled_at      = ?,
        campaign_id       = ?,
        metadata          = ?,
        version           = ?,
        updated_at        = CURRENT_TIMESTAMP
      WHERE id = ? AND brand_id = ?
    `).bind(
      derivedTitle, bodyText, hook || null, cta || null,
      safe(hashtags), safe(platforms), safe(platform_variants, '{}'),
      safe(media_ids), lifecycle_status,
      scheduled_at || null, campaign_id || null,
      safe(metadata, '{}'), version,
      id, brand_id
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO content_vault
        (id, brand_id, user_id, content_type, title, body, hook, cta,
         hashtags, platforms, platform_variants, media_ids,
         lifecycle_status, scheduled_at, campaign_id, metadata, version, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, brand_id, user_id || null, content_type,
      derivedTitle, bodyText, hook || null, cta || null,
      safe(hashtags), safe(platforms), safe(platform_variants, '{}'),
      safe(media_ids), lifecycle_status,
      scheduled_at || null, campaign_id || null,
      safe(metadata, '{}'), 1, source
    ).run();
  }

  // Mirror write to social_assets for delivery engine backward compat
  if (content_type === 'social') {
    const platformsArr = Array.isArray(platforms) ? platforms : JSON.parse(safe(platforms));
    try {
      if (existing) {
        await db.prepare(`
          UPDATE social_assets
          SET title = ?, text = ?, lifecycle_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND brand_id = ?
        `).bind(derivedTitle, bodyText, lifecycle_status, lifecycle_status, id, brand_id).run();
      } else {
        const ctxId = crypto.randomUUID();
        await db.batch([
          db.prepare(`INSERT OR IGNORE INTO content_context (id, brand_id, user_id, locale) VALUES (?, ?, ?, 'en')`)
            .bind(ctxId, brand_id, user_id || ''),
          db.prepare(`
            INSERT OR IGNORE INTO social_assets (id, brand_id, user_id, context_id, title, text, campaign_id, lifecycle_status, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(id, brand_id, user_id || '', ctxId, derivedTitle, bodyText, campaign_id || null, lifecycle_status, lifecycle_status),
        ]);
      }
      // Sync social_variants
      await db.prepare(`DELETE FROM social_variants WHERE social_asset_id = ?`).bind(id).run();
      const variantBatch = [{ platform: 'base', caption: bodyText }, ...platformsArr.map(p => ({ platform: p, caption: (platform_variants?.[p] || bodyText) }))];
      await db.batch(variantBatch.map(v =>
        db.prepare(`INSERT INTO social_variants (id, social_asset_id, platform, caption, status) VALUES (?, ?, ?, ?, 'draft')`)
          .bind(crypto.randomUUID(), id, v.platform, v.caption)
      ));
    } catch { /* mirror writes must not block vault write */ }
  }

  return json({ success: true, content_id: id, version, lifecycle_status });
}

/* ============================================================
   GET /api/customer/vault/:id
   ============================================================ */
export async function getVaultItem(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").pop();

  const db = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);

  // Attach delivery jobs for status context
  const { results: jobs } = await db.prepare(
    `SELECT platform, status, scheduled_at, external_post_id FROM delivery_jobs WHERE content_id = ? AND brand_id = ? ORDER BY scheduled_at ASC`
  ).bind(id, brand_id).all();

  // Attach approval request if any
  const approval = await db.prepare(
    `SELECT * FROM approval_requests WHERE content_id = ? AND brand_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(id, brand_id).first();

  return json({ success: true, data: { ...item, delivery_jobs: jobs || [], approval: approval || null } });
}

/* ============================================================
   DELETE /api/customer/vault/:id
   ============================================================ */
export async function deleteVaultItem(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").pop();

  const db = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);
  if (LOCKED_STATUSES.has(item.lifecycle_status)) {
    return error("Cannot delete scheduled or published content", "CONTENT_LOCKED", null, 409);
  }

  await db.batch([
    db.prepare(`DELETE FROM content_vault WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`DELETE FROM social_assets WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`DELETE FROM social_variants WHERE social_asset_id = ?`).bind(id),
    db.prepare(`DELETE FROM content_media_links WHERE content_id = ? AND brand_id = ?`).bind(id, brand_id),
  ]);

  return json({ success: true });
}

/* ============================================================
   POST /api/customer/vault/:id/approval
   Unified approval action: submit | approve | reject
   ============================================================ */
export async function vaultApproval(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id, user_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").slice(-2)[0];

  let body;
  try { body = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const { action, notes, reviewer_type = "client" } = body;

  if (!["submit", "approve", "reject"].includes(action)) {
    return error("action must be: submit | approve | reject", "BAD_REQUEST", null, 400);
  }

  const db = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);

  if (action === "submit") {
    // Lock check
    if (item.lifecycle_status === 'approval_requested') {
      return error("Already submitted for approval", "CONFLICT", null, 409);
    }

    const approvalId = crypto.randomUUID();
    let share_url = null;

    // Generate client share link if reviewer_type = client
    if (reviewer_type === "client") {
      const token  = crypto.randomUUID().replace(/-/g, '');
      const shareId = crypto.randomUUID();
      const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const msgUint8 = new TextEncoder().encode(token);
      const hashBuf  = await crypto.subtle.digest("SHA-256", msgUint8);
      const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

      await db.prepare(
        `INSERT INTO content_shares (id, brand_id, content_id, share_type, access_token_hash, expires_at) VALUES (?, ?, ?, 'client_review', ?, ?)`
      ).bind(shareId, brand_id, id, tokenHash, expires).run();

      share_url = `https://app.mypilotpost.com/approve/${token}`;
    }

    await db.batch([
      db.prepare(`UPDATE content_vault SET lifecycle_status = 'approval_requested', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE social_assets SET lifecycle_status = 'pending_approval', status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`INSERT INTO approval_requests (id, brand_id, content_id, content_type, requested_by, reviewer_type, review_notes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(approvalId, brand_id, id, item.content_type, user_id, reviewer_type, notes || null),
    ]);

    await insertExperienceNotification(db, brand_id, "approval", "Approval Requested", "Content locked pending review.");
    return json({ success: true, status: "approval_requested", share_url });
  }

  if (action === "approve") {
    await db.batch([
      db.prepare(`UPDATE content_vault SET lifecycle_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE social_assets SET lifecycle_status = 'approved', status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE approval_requests SET approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE content_id = ? AND brand_id = ? AND approved_at IS NULL`).bind(user_id, id, brand_id),
    ]);
    return json({ success: true, status: "approved" });
  }

  if (action === "reject") {
    await db.batch([
      db.prepare(`UPDATE content_vault SET lifecycle_status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE social_assets SET lifecycle_status = 'rejected', status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE approval_requests SET rejected_by = ?, rejection_reason = ? WHERE content_id = ? AND brand_id = ? AND approved_at IS NULL`).bind(user_id, notes || null, id, brand_id),
    ]);
    return json({ success: true, status: "draft" });
  }
}

/* ============================================================
   POST /api/customer/vault/:id/schedule
   Single scheduling entry point for all content types.
   ============================================================ */
export async function vaultSchedule(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id, user_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").slice(-2)[0];

  let body;
  try { body = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const { platforms = [], scheduled_at } = body;

  if (!scheduled_at) return error("scheduled_at is required", "BAD_REQUEST", null, 400);
  if (!isValidISO8601(scheduled_at)) return error("Invalid date format", "BAD_REQUEST", null, 400);
  if (new Date(scheduled_at) <= new Date()) return error("Cannot schedule in the past", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);

  const schedulablePlatforms = platforms.length
    ? platforms
    : JSON.parse(item.platforms || '[]');

  if (!schedulablePlatforms.length) return error("No platforms specified", "BAD_REQUEST", null, 400);

  const normalized = normalizeForSQLite(scheduled_at);
  const batch = [];

  for (const platform of schedulablePlatforms) {
    const conflict = await hasConflict(db, brand_id, platform, scheduled_at);
    if (conflict) continue;

    batch.push(db.prepare(`
      INSERT INTO delivery_jobs (id, brand_id, content_type, content_id, platform, scheduled_at, status, campaign_id)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).bind(crypto.randomUUID(), brand_id, item.content_type, id, platform, normalized, item.campaign_id || null));
  }

  if (!batch.length) return error("All platform slots are conflicted", "CONFLICT", null, 409);

  batch.push(
    db.prepare(`UPDATE content_vault SET lifecycle_status = 'scheduled', scheduled_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`)
      .bind(normalized, id, brand_id),
    db.prepare(`UPDATE social_assets SET lifecycle_status = 'scheduled', status = 'scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`)
      .bind(id, brand_id),
  );

  await db.batch(batch);
  await completeReferral(db, user_id, env).catch(() => {});
  await insertExperienceNotification(db, brand_id, "schedule", "Content Scheduled", `Publishing to ${schedulablePlatforms.join(", ")} at ${scheduled_at.slice(0, 16)}.`);

  return json({ success: true, jobs_created: batch.length - 2, scheduled_at });
}

/* ============================================================
   POST /api/customer/vault/:id/publish-now
   Immediate publish — creates a delivery job scheduled NOW.
   ============================================================ */
export async function vaultPublishNow(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id, user_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").slice(-2)[0];

  let body;
  try { body = await request.json(); }
  catch { body = {}; }

  const db  = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);

  const platforms = body.platforms?.length
    ? body.platforms
    : JSON.parse(item.platforms || '[]');

  if (!platforms.length) return error("No platforms specified", "BAD_REQUEST", null, 400);

  const nowUtc = normalizeForSQLite(new Date().toISOString());
  const batch  = [];
  let created  = 0;

  for (const platform of platforms) {
    const existing = await db.prepare(
      `SELECT id FROM delivery_jobs WHERE content_id = ? AND platform = ? AND status IN ('scheduled','processing')`
    ).bind(id, platform).first();
    if (existing) continue;

    batch.push(db.prepare(`
      INSERT INTO delivery_jobs (id, brand_id, content_type, content_id, platform, scheduled_at, status, campaign_id)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).bind(crypto.randomUUID(), brand_id, item.content_type, id, platform, nowUtc, item.campaign_id || null));
    created++;
  }

  if (batch.length) {
    batch.push(
      db.prepare(`UPDATE content_vault SET lifecycle_status = 'queued', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE social_assets SET lifecycle_status = 'queued', status = 'queued', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    );
    await db.batch(batch);
    await completeReferral(db, user_id, env).catch(() => {});
  }

  return json({ success: true, jobs_created: created });
}
